import React, { useState } from 'react';
import { useAgent } from '@/hooks/useAgent';

interface AgentChatProps {
  agentId: string;
  className?: string;
}

export function AgentChat({ agentId, className = '' }: AgentChatProps) {
  const [input, setInput] = useState('');
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
    retryLastMessage,
  } = useAgent({
    agentId,
    autoConnect: true,
    useWebSocketFallback: false, // Will auto-fallback if fetch streaming fails
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleRetry = async () => {
    try {
      await retryLastMessage();
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Agent Chat: {agentId}</h2>
        <button
          onClick={clearMessages}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Clear Chat
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700">
          <div className="flex justify-between items-center">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm">
                  <strong>Error:</strong> {error}
                </p>
                <p className="text-xs mt-1 text-red-600">
                  This might be due to streaming compatibility issues. The system will automatically try alternative methods.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="text-sm bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                Retry
              </button>
              <button
                onClick={clearError}
                className="text-sm bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            <p>Start a conversation with the agent</p>
            <p className="text-sm mt-2">
              The system uses robust streaming with automatic fallbacks to ensure reliable communication.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm">{message.content}</div>
              {message.streaming && (
                <div className="text-xs mt-1 opacity-75">
                  <span className="animate-pulse">Typing...</span>
                </div>
              )}
              {message.error && (
                <div className="text-xs mt-1 text-red-200">
                  Error: {message.error}
                </div>
              )}
              <div className="text-xs mt-1 opacity-75">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages.length > 0 && !messages[messages.length - 1]?.streaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                <span className="text-sm">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Stream-enabled with automatic fallback to ensure reliable messaging
        </p>
      </form>
    </div>
  );
}

// Example usage component
export function AnthropicAgentDemo() {
  return (
    <div className="max-w-2xl mx-auto h-96 border rounded-lg shadow-lg">
      <AgentChat agentId="anthropic" />
    </div>
  );
}