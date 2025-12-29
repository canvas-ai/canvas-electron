import { api } from '@/lib/api';
import { getApiUrl } from '@/config/api';
import { AnthropicConnector, WebSocketStreamingService, StreamMessage } from './streaming';

export interface AgentMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'agent';
  streaming?: boolean;
  error?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: 'anthropic' | 'openai' | 'custom';
  apiKey?: string;
  endpoint?: string;
  streamingSupported: boolean;
}

// Main Agent interface used throughout the application
export interface Agent {
  id: string;
  name: string;
  label?: string;
  description?: string;
  color?: string;
  status: 'active' | 'inactive' | 'error' | 'starting' | 'stopping' | 'available';
  isActive: boolean;
  llmProvider: 'anthropic' | 'openai' | 'ollama' | 'custom';
  model: string;
  lastAccessed?: string;
  config: {
    type: 'anthropic' | 'openai' | 'ollama' | 'custom';
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    prompts?: {
      system?: string;
      user?: string;
    };
    connectors?: {
      [key: string]: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        topK?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
        numCtx?: number;
        reasoning?: boolean;
      };
    };
    mcp?: {
      enabled: boolean;
      servers: Array<{
        name: string;
        command: string;
        args?: string[];
        env?: Record<string, string>;
      }>;
    };
    parameters?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
    };
  };
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

// MCP Tool interface for Model Context Protocol tools
export interface MCPTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  server: string;
  source: string;
}

// Agent memory interface
export interface AgentMemory {
  id: string;
  agentId: string;
  type: 'conversation' | 'context' | 'instruction';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  timestamp?: string;
  user_message?: string;
  agent_response?: string;
}

// Chat message interface for streaming chat
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    provider?: string;
    toolCalls?: any[];
  };
}

// Agent creation data interface
export interface CreateAgentData {
  name: string;
  label?: string;
  description?: string;
  color?: string;
  llmProvider?: 'anthropic' | 'openai' | 'ollama' | 'custom';
  model?: string;
  config: Partial<Agent['config']>;
  connectors?: {
    [key: string]: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      numCtx?: number;
      reasoning?: boolean;
    };
  };
  mcp?: {
    enabled: boolean;
    servers: Array<{
      name: string;
      command: string;
      args?: string[];
      env?: Record<string, string>;
    }>;
  };
}

export class AgentService {
  private connectors = new Map<string, AnthropicConnector>();
  private wsService: WebSocketStreamingService | null = null;
  private messageCallbacks = new Map<string, (message: AgentMessage) => void>();

  constructor() {
    // Initialize WebSocket fallback if needed
    this.initializeWebSocketFallback();
  }

  private async initializeWebSocketFallback(): Promise<void> {
    try {
      // Get WebSocket URL from current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.wsService = new WebSocketStreamingService(wsUrl);
      // Don't auto-connect, only use as fallback
    } catch (error) {
      console.warn('WebSocket fallback not available:', error);
    }
  }

  /**
   * Registers an agent with the service
   */
  registerAgent(config: AgentConfig): void {
    if (config.type === 'anthropic') {
      const connector = new AnthropicConnector(
        config.apiKey || '',
        config.endpoint || `${getApiUrl()}/agents/${config.id}`
      );
      this.connectors.set(config.id, connector);
    }
  }

  /**
   * Sends a message to an agent with streaming support
   */
  async sendMessage(
    agentId: string,
    message: string,
    options: {
      onMessage?: (message: AgentMessage) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
      useWebSocketFallback?: boolean;
    } = {}
  ): Promise<void> {
    const { onMessage, onError, onComplete, useWebSocketFallback = false } = options;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store callback for this message
    if (onMessage) {
      this.messageCallbacks.set(messageId, onMessage);
    }

    try {
      if (useWebSocketFallback && this.wsService) {
        // Use WebSocket fallback
        await this.sendMessageViaWebSocket(agentId, messageId, message, onMessage, onError);
        if (onComplete) {
          onComplete();
        }
        return;
      }

      // Try to use the specific connector first
      const connector = this.connectors.get(agentId);
      if (connector) {
        await connector.chatStream(message, {
          agentId,
          messageId,
          onMessage: (streamMsg: StreamMessage) => {
            const agentMessage: AgentMessage = {
              id: streamMsg.messageId,
              agentId: streamMsg.agentId,
              content: streamMsg.content || '',
              timestamp: new Date(),
              type: 'agent',
              streaming: !streamMsg.done,
              error: streamMsg.error,
            };

            if (onMessage) {
              onMessage(agentMessage);
            }
          },
          onError: (error: Error) => {
            console.error('Agent connector error:', error);
            // Try WebSocket fallback on fetch streaming failure
            if (error.message.includes('getReader is not a function') && this.wsService) {
              console.log('Falling back to WebSocket streaming...');
              this.sendMessageViaWebSocket(agentId, messageId, message, onMessage, onError);
              return;
            }
            if (onError) {
              onError(error);
            }
          },
          onComplete,
        });
      } else {
        // Fallback to generic API streaming
        await this.sendMessageViaAPI(agentId, messageId, message, onMessage, onError, onComplete);
      }
    } catch (error) {
      console.error('Agent communication error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      // Clean up callback
      this.messageCallbacks.delete(messageId);
    }
  }

  private async sendMessageViaAPI(
    agentId: string,
    messageId: string,
    message: string,
    onMessage?: (message: AgentMessage) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      await api.stream(`/agents/${agentId}/chat`, {
        message,
        messageId,
        stream: true,
      }, {
        onChunk: (chunk: string) => {
          try {
            // Try to parse as JSON first
            const data = JSON.parse(chunk);
            const agentMessage: AgentMessage = {
              id: messageId,
              agentId,
              content: data.content || chunk,
              timestamp: new Date(),
              type: 'agent',
              streaming: !data.done,
              error: data.error,
            };

            if (onMessage) {
              onMessage(agentMessage);
            }
          } catch {
            // If not JSON, treat as raw text
            const agentMessage: AgentMessage = {
              id: messageId,
              agentId,
              content: chunk,
              timestamp: new Date(),
              type: 'agent',
              streaming: true,
            };

            if (onMessage) {
              onMessage(agentMessage);
            }
          }
        },
        onError: (error: Error) => {
          console.error('API streaming error:', error);
          if (onError) {
            onError(error);
          }
        },
        onComplete,
      });
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private async sendMessageViaWebSocket(
    agentId: string,
    messageId: string,
    message: string,
    onMessage?: (message: AgentMessage) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!this.wsService) {
      if (onError) {
        onError(new Error('WebSocket service not available'));
      }
      return;
    }

    try {
      // Connect if not already connected
      if (this.wsService['socket']?.readyState !== WebSocket.OPEN) {
        await this.wsService.connect();
      }

      this.wsService.startChatStream(
        agentId,
        messageId,
        message,
        (streamMsg: StreamMessage) => {
          const agentMessage: AgentMessage = {
            id: streamMsg.messageId,
            agentId: streamMsg.agentId,
            content: streamMsg.content || '',
            timestamp: new Date(),
            type: 'agent',
            streaming: !streamMsg.done,
            error: streamMsg.error,
          };

          if (onMessage) {
            onMessage(agentMessage);
          }
        },
        onError
      );
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Gets list of available agents
   */
  async getAvailableAgents(): Promise<AgentConfig[]> {
    try {
      const response = await api.get<{agents: AgentConfig[]}>(`/agents`);
      return response.agents || [];
    } catch (error) {
      console.error('Failed to fetch available agents:', error);
      return [];
    }
  }

  /**
   * Creates a new agent configuration
   */
  async createAgent(config: Omit<AgentConfig, 'id'>): Promise<AgentConfig> {
    const response = await api.post<AgentConfig>(`/agents`, config);

    // Register the new agent
    this.registerAgent(response);

    return response;
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.connectors.clear();
    this.messageCallbacks.clear();
    if (this.wsService) {
      this.wsService.disconnect();
    }
  }
}

// Export singleton instance
export const agentService = new AgentService();

// Agent API Functions
// ===================

/**
 * List all available agents
 */
export async function listAgents(): Promise<Agent[]> {
  try {
    const response = await api.get<{ payload: Agent[] }>(`/agents`);
    return response.payload || [];
  } catch (error) {
    console.error('Failed to list agents:', error);
    return [];
  }
}

/**
 * Get a specific agent by ID
 */
export async function getAgent(agentId: string): Promise<Agent> {
  const response = await api.get<{ payload: Agent }>(`/agents/${agentId}`);
  return response.payload;
}

/**
 * Create a new agent
 */
export async function createAgent(agentData: CreateAgentData): Promise<Agent> {
  const response = await api.post<{ payload: Agent }>(`/agents`, agentData);
  return response.payload;
}

/**
 * Update an existing agent
 */
export async function updateAgent(agentId: string, agentData: Partial<CreateAgentData>): Promise<Agent> {
  const response = await api.put<{ payload: Agent }>(`/agents/${agentId}`, agentData);
  return response.payload;
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
  await api.delete(`/agents/${agentId}`);
}

/**
 * Start an agent
 */
export async function startAgent(agentId: string): Promise<Agent> {
  const response = await api.post<{ payload: Agent }>(`/agents/${agentId}/start`);
  return response.payload;
}

/**
 * Stop an agent
 */
export async function stopAgent(agentId: string): Promise<Agent> {
  const response = await api.post<{ payload: Agent }>(`/agents/${agentId}/stop`);
  return response.payload;
}

/**
 * Get agent status
 */
export async function getAgentStatus(agentId: string): Promise<{ status: string; isActive: boolean; lastAccessed?: string }> {
  const response = await api.get<{ payload: { status: string; isActive: boolean; lastAccessed?: string } }>(`/agents/${agentId}/status`);
  return response.payload;
}

// Agent Memory Functions
// ======================

/**
 * Get agent memory
 */
export async function getAgentMemory(agentId: string): Promise<AgentMemory[]> {
  try {
    const response = await api.get<{ payload: AgentMemory[] }>(`/agents/${agentId}/memory`);
    return response.payload || [];
  } catch (error) {
    console.error('Failed to get agent memory:', error);
    return [];
  }
}

/**
 * Clear agent memory
 */
export async function clearAgentMemory(agentId: string): Promise<void> {
  await api.delete(`/agents/${agentId}/memory`);
}

// MCP Tool Functions
// ==================

/**
 * Get MCP tools for an agent
 */
export async function getAgentMCPTools(agentId: string): Promise<MCPTool[]> {
  try {
    const response = await api.get<{ payload: MCPTool[] }>(`/agents/${agentId}/mcp/tools`);
    return response.payload || [];
  } catch (error) {
    console.error('Failed to get MCP tools:', error);
    return [];
  }
}

/**
 * Call an MCP tool
 */
export async function callMCPTool(
  agentId: string,
  toolName: string,
  arguments_: Record<string, any>,
  source?: string
): Promise<any> {
  const response = await api.post<{ payload: any }>(`/agents/${agentId}/mcp/tools/${toolName}`, {
    arguments: arguments_,
    source
  });
  return response.payload;
}

// Chat Functions for Streaming
// =============================

/**
 * Chat with agent using streaming
 */
export async function chatWithAgentStream(
  agentId: string,
  message: string,
  options: {
    onMessage?: (content: any, isComplete: any, metadata: any) => void;
    onError?: (error: any) => void;
    onComplete?: () => void;
    context?: ChatMessage[];
    mcpContext?: boolean;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<void> {
  const { onMessage, onError, onComplete, context, mcpContext, maxTokens, temperature } = options;

  await api.stream(`/agents/${agentId}/chat`, {
    message,
    context,
    mcpContext,
    maxTokens,
    temperature,
    stream: true
  }, {
    onChunk: (chunk: string) => {
      try {
        // Handle SSE-style streaming
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (onMessage) {
              onMessage(data.content || data.delta || '', data.done || false, data.metadata || {});
            }
          }
        }
      } catch (error) {
        // Handle plain text chunks
        if (onMessage && chunk.trim()) {
          onMessage(chunk, false, {});
        }
      }
    },
    onError,
    onComplete
  });
}

/**
 * Chat with agent using fallback method
 */
export async function chatWithAgentFallback(
  agentId: string,
  options: {
    message: string;
    onMessage?: (content: any, isComplete: any, metadata: any) => void;
    onError?: (error: any) => void;
    onComplete?: () => void;
    context?: ChatMessage[];
    mcpContext?: boolean;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{ content: string; metadata?: any }> {
  const { message, onMessage, onError, onComplete, context, mcpContext, maxTokens, temperature } = options;

  try {
    const response = await api.post<{
      payload: {
        content: string;
        metadata?: any;
      }
    }>(`/agents/${agentId}/chat`, {
      message,
      context,
      mcpContext,
      maxTokens,
      temperature,
      stream: false
    });

    if (onMessage) {
      onMessage(response.payload.content, true, response.payload.metadata || {});
    }
    if (onComplete) {
      onComplete();
    }

    return response.payload;
  } catch (error) {
    if (onError) {
      onError(error);
    }
    throw error;
  }
}

/**
 * Convert chat messages to streaming format
 */
export function convertToStreamingMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(msg => ({
    ...msg,
    timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString()
  }));
}
