import { useState, useCallback, useEffect, useRef } from 'react';
import { agentService, AgentMessage, AgentConfig } from '@/services/agent';

export interface UseAgentOptions {
  agentId: string;
  autoConnect?: boolean;
  useWebSocketFallback?: boolean;
}

export interface UseAgentReturn {
  messages: AgentMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  retryLastMessage: () => Promise<void>;
}

export function useAgent(options: UseAgentOptions): UseAgentReturn {
  const { agentId, autoConnect = true, useWebSocketFallback = false } = options;
  
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastMessageRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize agent if needed
  useEffect(() => {
    if (autoConnect) {
      // Try to register the agent if it's not already registered
      agentService.getAvailableAgents().then(agents => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
          agentService.registerAgent(agent);
        }
      }).catch(console.error);
    }
  }, [agentId, autoConnect]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    setError(null);
    lastMessageRef.current = message;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message immediately
    const userMessage: AgentMessage = {
      id: `user_${Date.now()}`,
      agentId,
      content: message,
      timestamp: new Date(),
      type: 'user',
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      await agentService.sendMessage(agentId, message, {
        useWebSocketFallback,
        onMessage: (agentMessage: AgentMessage) => {
          setMessages(prev => {
            // Check if this message already exists (update if streaming)
            const existingIndex = prev.findIndex(m => m.id === agentMessage.id);
            if (existingIndex >= 0) {
              // Update existing message
              const newMessages = [...prev];
              newMessages[existingIndex] = agentMessage;
              return newMessages;
            } else {
              // Add new message
              return [...prev, agentMessage];
            }
          });
        },
        onError: (err: Error) => {
          console.error('Agent communication error:', err);
          setError(err.message);
          setIsLoading(false);
        },
        onComplete: () => {
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsLoading(false);
    }
  }, [agentId, useWebSocketFallback]);

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current) {
      await sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
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
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
    retryLastMessage,
  };
}

// Hook for managing available agents
export function useAgents() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const availableAgents = await agentService.getAvailableAgents();
      setAgents(availableAgents);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (config: Omit<AgentConfig, 'id'>) => {
    setError(null);
    
    try {
      const newAgent = await agentService.createAgent(config);
      setAgents(prev => [...prev, newAgent]);
      return newAgent;
    } catch (err) {
      console.error('Failed to create agent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    clearError: () => setError(null),
  };
}