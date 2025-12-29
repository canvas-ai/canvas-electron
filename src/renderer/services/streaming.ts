interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

export interface StreamMessage {
  agentId: string;
  messageId: string;
  content?: string;
  error?: string;
  done?: boolean;
}

export class StreamingService {
  /**
   * Handles streaming responses from the server with proper error handling
   * for cases where response.body.getReader is not available or fails
   */
  static async handleStreamingResponse(
    response: Response,
    options: StreamingOptions = {}
  ): Promise<void> {
    const { onChunk, onError, onComplete, signal } = options;

    try {
      // Check if the response body exists and supports streaming
      if (!response.body) {
        throw new Error('Response body is null - streaming not supported');
      }

      // Check if getReader is available on the response body
      if (typeof response.body.getReader !== 'function') {
        // Fallback: try to read the entire response as text
        console.warn('ReadableStream.getReader not available, falling back to text response');
        const text = await response.text();
        if (onChunk) {
          onChunk(text);
        }
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          // Check for abort signal
          if (signal?.aborted) {
            reader.cancel();
            throw new Error('Stream aborted');
          }

          const { done, value } = await reader.read();

          if (done) {
            if (onComplete) {
              onComplete();
            }
            break;
          }

          // Decode the chunk and process it
          const chunk = decoder.decode(value, { stream: true });
          if (chunk && onChunk) {
            onChunk(chunk);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Processes Server-Sent Events (SSE) style streaming data
   */
  static processSSEChunk(chunk: string): StreamMessage[] {
    const messages: StreamMessage[] = [];
    const lines = chunk.split('\n');

    let currentMessage: Partial<StreamMessage> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          currentMessage = { ...currentMessage, ...data };
        } catch (error) {
          console.warn('Failed to parse SSE data:', trimmed);
        }
      } else if (trimmed === '') {
        // Empty line indicates end of message
        if (currentMessage.agentId && currentMessage.messageId) {
          messages.push(currentMessage as StreamMessage);
        }
        currentMessage = {};
      }
    }

    return messages;
  }
}

/**
 * AnthropicConnector - A robust connector for Anthropic API that handles
 * streaming responses with proper error handling
 */
export class AnthropicConnector {
  private baseUrl: string;

  constructor(_apiKey: string, baseUrl: string = '/rest/v2/agents/anthropic') {
    // apiKey parameter kept for API compatibility but not currently used
    // as authentication is handled by the server via session tokens
    this.baseUrl = baseUrl;
  }

  /**
   * Initiates a chat stream with proper error handling for getReader issues
   */
  async chatStream(
    message: string,
    options: {
      agentId: string;
      messageId: string;
      onMessage?: (message: StreamMessage) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
      signal?: AbortSignal;
    }
  ): Promise<void> {
    const { agentId, messageId, onMessage, onError, onComplete, signal } = options;

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain, text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          message,
          agentId,
          messageId,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Use our robust streaming handler
      await StreamingService.handleStreamingResponse(response, {
        onChunk: (chunk: string) => {
          try {
            // Process the chunk as SSE data
            const messages = StreamingService.processSSEChunk(chunk);
            messages.forEach(msg => {
              if (onMessage) {
                onMessage(msg);
              }
            });
          } catch (error) {
            console.warn('Failed to process streaming chunk:', error);
          }
        },
        onError: (error: Error) => {
          const streamError = new Error(
            `Chat stream failed: AnthropicConnector chatStream failed: ${error.message}`
          );
          console.error('Chat stream error:', {
            agentId,
            messageId,
            error: streamError.message
          });
          if (onError) {
            onError(streamError);
          }
        },
        onComplete,
        signal,
      });
    } catch (error) {
      const streamError = new Error(
        `Chat stream failed: AnthropicConnector chatStream failed: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error('Chat stream error:', {
        agentId,
        messageId,
        error: streamError.message
      });
      if (onError) {
        onError(streamError);
      }
    }
  }
}

/**
 * WebSocket-based streaming fallback for environments where
 * fetch streaming is not reliable
 */
export class WebSocketStreamingService {
  private socket: WebSocket | null = null;
  private messageHandlers = new Map<string, (message: StreamMessage) => void>();

  constructor(private wsUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connected for streaming');
          resolve();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.socket.onmessage = (event) => {
          try {
            const message: StreamMessage = JSON.parse(event.data);
            const key = `${message.agentId}-${message.messageId}`;
            const handler = this.messageHandlers.get(key);
            if (handler) {
              handler(message);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.socket = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  startChatStream(
    agentId: string,
    messageId: string,
    message: string,
    onMessage: (message: StreamMessage) => void,
    onError?: (error: Error) => void
  ): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (onError) {
        onError(new Error('WebSocket not connected'));
      }
      return;
    }

    const key = `${agentId}-${messageId}`;
    this.messageHandlers.set(key, onMessage);

    try {
      this.socket.send(JSON.stringify({
        type: 'chat_stream',
        agentId,
        messageId,
        message,
      }));
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  stopChatStream(agentId: string, messageId: string): void {
    const key = `${agentId}-${messageId}`;
    this.messageHandlers.delete(key);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageHandlers.clear();
  }
}
