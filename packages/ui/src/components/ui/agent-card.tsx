import { useState } from "react"
import { Button } from "./button"
import { Play, Square, MessageCircle, Cpu, Brain, Zap } from "lucide-react"

type Agent = {
  name: string
  label?: string
  description?: string
  color?: string
  status: 'active' | 'inactive' | 'error' | 'starting' | 'stopping' | 'available'
  llmProvider: 'anthropic' | 'openai' | 'ollama' | 'custom'
  model: string
  lastAccessed?: string
  config: {
    mcp?: {
      servers: Array<{ name: string }>
    }
  }
  createdAt: string
}

interface AgentCardProps {
  agent: Agent
  onStart: (agentName: string) => void
  onStop: (agentName: string) => void
  onEnter: (agentName: string) => void
}

export function AgentCard({ agent, onStart, onStop, onEnter }: AgentCardProps) {
  const [isActionLoading, setIsActionLoading] = useState(false)

  const handleStart = async () => {
    setIsActionLoading(true)
    try {
      await onStart(agent.name)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleStop = async () => {
    setIsActionLoading(true)
    try {
      await onStop(agent.name)
    } finally {
      setIsActionLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'active':
        return <Cpu className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <Cpu className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <Cpu className="h-4 w-4 text-red-600" />
      default:
        return <Cpu className="h-4 w-4 text-gray-400" />
    }
  }

  const getProviderIcon = () => {
    switch (agent.llmProvider) {
      case 'anthropic':
        return <Brain className="h-4 w-4 text-orange-600" />
      case 'openai':
        return <Brain className="h-4 w-4 text-green-600" />
      case 'ollama':
        return <Zap className="h-4 w-4 text-blue-600" />
      default:
        return <Brain className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'inactive':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'available':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const canStart = agent.status === 'available' || agent.status === 'inactive'
  const canStop = agent.status === 'active'

  return (
    <div className="border rounded-lg p-4 space-y-4 hover:shadow-md transition-shadow bg-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getProviderIcon()}
            <h3 className="text-lg font-semibold truncate">
              {agent.label || agent.name}
            </h3>
            {agent.color && (
              <div
                className="w-4 h-4 rounded border flex-shrink-0"
                style={{ backgroundColor: agent.color }}
                title={`Color: ${agent.color}`}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono">{agent.name}</p>
          {agent.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {agent.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusIcon()}
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Agent Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Provider:</span>
          <div className="font-medium capitalize">{agent.llmProvider}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Model:</span>
          <div className="font-mono text-xs">{agent.model}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Created:</span>
          <div>{new Date(agent.createdAt).toLocaleDateString()}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Last Access:</span>
          <div>
            {agent.lastAccessed
              ? new Date(agent.lastAccessed).toLocaleDateString()
              : 'Never'}
          </div>
        </div>
      </div>

      {/* MCP Servers Info */}
      {agent.config.mcp?.servers && agent.config.mcp.servers.length > 0 && (
        <div className="text-sm">
          <span className="text-muted-foreground">MCP Servers:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {agent.config.mcp.servers.map((server, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
              >
                {server.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        {canStart && (
          <Button
            onClick={handleStart}
            disabled={isActionLoading}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Play className="mr-2 h-4 w-4" />
            Start
          </Button>
        )}

        {canStop && (
          <Button
            onClick={handleStop}
            disabled={isActionLoading}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        )}

        <Button
          onClick={() => onEnter(agent.name)}
          size="sm"
          className="flex-1"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Chat
        </Button>
      </div>
    </div>
  )
}
