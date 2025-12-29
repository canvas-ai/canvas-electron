import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useAgentSocket,
  StreamingChatMessage,
  StreamingChatRequest,
  StreamingChatChunk,
  StreamingChatError
} from './useAgentSocket';
import {
  chatWithAgentStream,
  chatWithAgentFallback,
  convertToStreamingMessages,
  ChatMessage
} from '@/services/agent';

export interface UseAgentChatOptions {
  agentId: string;
  initialMessages?: ChatMessage[];
  onError?: (error: Error) => void;
  enableWebSocket?: boolean;
  enableSSE?: boolean;
  enableFallback?: boolean;
  llmProvider?: 'anthropic' | 'openai' | 'ollama' | 'custom'; // Add provider info
}

export interface ChatState {
  messages: StreamingChatMessage[];
  isStreaming: boolean;
  currentStreamingMessage: StreamingChatMessage | null;
  connectionStatus: 'websocket' | 'sse' | 'rest' | 'disconnected';
  error: string | null;
}

export function useAgentChat(options: UseAgentChatOptions) {
  const {
    agentId,
    initialMessages = [],
    onError,
    enableWebSocket = true,
    enableSSE = true,
    enableFallback = true,
    llmProvider
  } = options;

  // Chat state
  const [messages, setMessages] = useState<StreamingChatMessage[]>(
    convertToStreamingMessages(initialMessages)
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<StreamingChatMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ChatState['connectionStatus']>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Refs for managing state
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<string | null>(null);

  // WebSocket functionality
  const { isConnected, startStreamingChat } = useAgentSocket({
    agentId: enableWebSocket ? agentId : undefined,
    onMessage: handleWebSocketMessage,
    onComplete: handleWebSocketComplete,
    onError: handleWebSocketError
  });

  // Update connection status based on WebSocket state
  useEffect(() => {
    if (enableWebSocket && isConnected) {
      setConnectionStatus('websocket');
    } else if (connectionStatus === 'websocket') {
      setConnectionStatus('disconnected');
    }
  }, [isConnected, enableWebSocket]);

  function handleWebSocketMessage(chunk: StreamingChatChunk) {
    if (chunk.messageId !== currentMessageRef.current) {
      return; // Ignore messages from old sessions
    }

    console.log('Processing WebSocket chunk:', {
      type: chunk.type,
      content: chunk.content,
      delta: chunk.delta
    });

    // Handle different chunk types from backend
    if (chunk.type === 'content' || chunk.type === 'chunk') {
      setCurrentStreamingMessage(prev => {
        const updatedMessage = prev ? {
          ...prev,
          content: prev.content + (chunk.delta || chunk.content || ''),
          isComplete: false
        } : {
          role: 'assistant' as const,
          content: chunk.delta || chunk.content || '',
          timestamp: new Date().toISOString(),
          isComplete: false
        };

        return updatedMessage;
      });
    } else if (chunk.type === 'complete' || chunk.type === 'done') {
      // Mark current streaming message as complete
      setCurrentStreamingMessage(prev => {
        if (prev) {
          const completedMessage = { ...prev, isComplete: true };
          setMessages(prevMessages => [...prevMessages, completedMessage]);
          setIsStreaming(false);
          currentMessageRef.current = null;
          return null;
        }
        return null;
      });
    }
  }

  function handleWebSocketComplete(_agentId: string, messageId: string) {
    if (messageId === currentMessageRef.current) {
      // Move streaming message to completed messages
      setCurrentStreamingMessage(prev => {
        if (prev) {
          const completedMessage = { ...prev, isComplete: true };
          setMessages(prevMessages => [...prevMessages, completedMessage]);
        }
        return null;
      });
      setIsStreaming(false);
      currentMessageRef.current = null;
    }
  }

  function handleWebSocketError(error: StreamingChatError) {
    if (error.messageId === currentMessageRef.current) {
      console.error('WebSocket streaming error:', error);
      setError(error.error);
      setIsStreaming(false);
      currentMessageRef.current = null;

      if (onError) {
        onError(new Error(error.error));
      }
    }
  }

  const sendMessage = useCallback(async (
    message: string,
    options: {
      mcpContext?: boolean;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ) => {
    if (isStreaming) {
      throw new Error('Cannot send message while streaming');
    }

    // Clear any previous errors
    setError(null);

    // Add user message to chat
    const userMessage: StreamingChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      isComplete: true
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    const request: StreamingChatRequest = {
      message,
      context: messages.slice(-10), // Last 10 messages for context
      mcpContext: options.mcpContext ?? true,
      maxTokens: options.maxTokens,
      temperature: options.temperature
    };

    // Smart streaming method selection based on provider
    const shouldUseWebSocket = enableWebSocket && isConnected && llmProvider !== 'ollama';
    const shouldUseSSE = enableSSE;

    // Log streaming strategy
    if (llmProvider === 'ollama') {
      console.log('🦙 Ollama detected: Using SSE streaming (WebSocket not supported by Ollama)');
    }

    // Try WebSocket first (except for Ollama)
    if (shouldUseWebSocket) {
      try {
        console.log(`🔌 Attempting WebSocket streaming for ${llmProvider || 'unknown'} provider...`);
        const messageId = startStreamingChat(agentId, request);
        currentMessageRef.current = messageId;
        setConnectionStatus('websocket');
        return;
      } catch (error) {
        console.warn(`WebSocket streaming failed for ${llmProvider || 'unknown'}, falling back to SSE:`, error);
      }
    }

    // Try SSE (primary method for Ollama, fallback for others)
    if (shouldUseSSE) {
      try {
        console.log(`📡 ${llmProvider === 'ollama' ? 'Using' : 'Attempting'} SSE streaming for ${llmProvider || 'unknown'} provider...`);
        setConnectionStatus('sse');

        abortControllerRef.current = new AbortController();
        let streamingMessage = '';

        await chatWithAgentStream(
          agentId,
          request.message,
          {
            onMessage: (content: string, isComplete: boolean, metadata: any) => {
              streamingMessage += content;

              setCurrentStreamingMessage({
                role: 'assistant',
                content: streamingMessage,
                timestamp: new Date().toISOString(),
                isComplete,
                metadata
              });

              if (isComplete) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: streamingMessage,
                  timestamp: new Date().toISOString(),
                  isComplete: true,
                  metadata
                }]);
                setCurrentStreamingMessage(null);
                setIsStreaming(false);
              }
            },
            onError: (error: Error) => {
              console.error('SSE streaming error:', error);
              setError(error.message);
              setIsStreaming(false);
              if (onError) onError(error);
            },
            context: messages.slice(-10).map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              metadata: msg.metadata
            })),
            mcpContext: options.mcpContext ?? true,
            maxTokens: options.maxTokens,
            temperature: options.temperature
          }
        );
        return;
      } catch (error) {
        console.warn(`SSE streaming failed for ${llmProvider || 'unknown'}, falling back to REST:`, error);
      }
    }

    // Final fallback to regular REST API
    if (enableFallback) {
      try {
        console.log(`⚙️ Using REST API fallback for ${llmProvider || 'unknown'} provider...`);
        setConnectionStatus('rest');

        const response = await chatWithAgentFallback(agentId, {
          message,
          context: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata
          })),
          mcpContext: options.mcpContext ?? true,
          maxTokens: options.maxTokens,
          temperature: options.temperature
        });

        const assistantMessage: StreamingChatMessage = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
          isComplete: true,
          metadata: response.metadata
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsStreaming(false);
      } catch (error) {
        console.error('All chat methods failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
        setError(errorMessage);
        setIsStreaming(false);

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    } else {
      setError('All streaming methods failed and fallback is disabled');
      setIsStreaming(false);
    }
  }, [
    agentId,
    messages,
    isStreaming,
    isConnected,
    startStreamingChat,
    enableWebSocket,
    enableSSE,
    enableFallback,
    llmProvider, // Add llmProvider to dependencies
    onError
  ]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentStreamingMessage(null);
    setError(null);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    currentMessageRef.current = null;
    setIsStreaming(false);
    setCurrentStreamingMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    messages,
    isStreaming,
    currentStreamingMessage,
    connectionStatus,
    error,

    // Actions
    sendMessage,
    clearMessages,
    stopStreaming,

    // Computed state
    allMessages: currentStreamingMessage
      ? [...messages, currentStreamingMessage]
      : messages,

    // Status helpers
    isWebSocketConnected: connectionStatus === 'websocket',
    isUsingSSE: connectionStatus === 'sse',
    isUsingREST: connectionStatus === 'rest'
  };
}
