import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_ROUTES } from '@/config/api';

export interface StreamingChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isComplete?: boolean;
  metadata?: {
    model?: string;
    provider?: string;
    toolCalls?: any[];
  };
}

// Updated to match backend format
export interface StreamingChatChunk {
  agentId: string;
  messageId: string;  // Backend uses messageId, not sessionId
  type: string;       // Backend uses type field
  content: string;
  delta: string;      // Backend includes delta field
}

export interface StreamingChatRequest {
  message: string;
  context?: StreamingChatMessage[];
  mcpContext?: boolean;
  maxTokens?: number;
  temperature?: number;
  messageId?: string; // Add messageId for session tracking
}

export interface StreamingChatError {
  agentId: string;
  messageId?: string; // Updated to match backend
  error: string;
  details?: any;
}

export interface UseAgentSocketOptions {
  agentId?: string;
  onMessage?: (chunk: StreamingChatChunk) => void;
  onComplete?: (agentId: string, messageId: string) => void;
  onError?: (error: StreamingChatError) => void;
}

export function useAgentSocket(options: UseAgentSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const optionsRef = useRef(options);

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    // Log token type for debugging
    console.log(`[WebSocket] Using token type: ${token.startsWith('canvas-') ? 'API' : 'JWT'}, length: ${token.length}`);

    setIsConnecting(true);

    const socketInstance = io(API_ROUTES.ws, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000, // Add timeout
      forceNew: true   // Force new connection to avoid token caching issues
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Agent WebSocket connected successfully');
      setIsConnected(true);
      setIsConnecting(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Agent WebSocket connection error:', error);
      setIsConnected(false);
      setIsConnecting(false);

      // If auth error, try to refresh token or fallback to SSE
      if (error.message?.includes('Auth error') || error.message?.includes('token')) {
        console.warn('WebSocket auth failed, will fallback to SSE for streaming');
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Agent WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    // Agent-specific events - updated to match backend format
    socketInstance.on('agent:chat:chunk', (chunk: StreamingChatChunk) => {
      console.log('Received chat chunk:', chunk);
      if (optionsRef.current.onMessage) {
        optionsRef.current.onMessage(chunk);
      }
    });

    // Backend sends different completion event
    socketInstance.on('agent:chat:complete', (data: { agentId: string; messageId: string }) => {
      console.log('Chat stream complete:', data);
      if (optionsRef.current.onComplete) {
        optionsRef.current.onComplete(data.agentId, data.messageId);
      }
    });

    socketInstance.on('agent:chat:error', (error: StreamingChatError) => {
      console.error('Chat stream error:', error);
      if (optionsRef.current.onError) {
        optionsRef.current.onError(error);
      }
    });

    // Additional events from backend
    socketInstance.on('agent:chat:start', (data: { agentId: string; messageId: string }) => {
      console.log('Chat stream started:', data);
    });

    setSocket(socketInstance);
  }, []);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [socket]);

  // Backend uses agent:subscribe instead of agent:join
  const joinAgentChannel = useCallback((agentId: string) => {
    if (socket && isConnected) {
      console.log(`Subscribing to agent channel: ${agentId}`);
      socket.emit('agent:subscribe', { agentId });
    }
  }, [socket, isConnected]);

  const leaveAgentChannel = useCallback((agentId: string) => {
    if (socket && isConnected) {
      console.log(`Unsubscribing from agent channel: ${agentId}`);
      socket.emit('agent:unsubscribe', { agentId });
    }
  }, [socket, isConnected]);

  const startStreamingChat = useCallback((agentId: string, request: StreamingChatRequest): string => {
    if (!socket || !isConnected) {
      throw new Error('WebSocket not connected');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Starting streaming chat for agent ${agentId}, message ${messageId}`);
    socket.emit('agent:chat:stream', {
      agentId,
      messageId,
      ...request
    });

    return messageId;
  }, [socket, isConnected]);

  // Auto-connect effect
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  // Join/leave agent channel when agentId changes
  useEffect(() => {
    if (isConnected && options.agentId) {
      joinAgentChannel(options.agentId);

      return () => {
        if (options.agentId) {
          leaveAgentChannel(options.agentId);
        }
      };
    }
  }, [isConnected, options.agentId, joinAgentChannel, leaveAgentChannel]);

  return {
    socket,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    joinAgentChannel,
    leaveAgentChannel,
    startStreamingChat
  };
}
