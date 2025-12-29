import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast-container"
import { Plus } from "lucide-react"
import { AgentCard } from "@/components/ui/agent-card"
import { useNavigate } from "react-router-dom"
import { useSocket } from "@/hooks/useSocket"
import { generateNiceRandomHexColor } from "@/utils/color"
import { useSocketSubscription } from "@/hooks/useSocketSubscription"
import {
  listAgents,
  createAgent,
  startAgent,
  stopAgent,
  Agent,
  CreateAgentData,
} from "@/services/agent"

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentDescription, setNewAgentDescription] = useState("")
  const [newAgentColor, setNewAgentColor] = useState(generateNiceRandomHexColor())
  const [newAgentLabel, setNewAgentLabel] = useState("")
  const [newAgentProvider, setNewAgentProvider] = useState<'anthropic' | 'openai' | 'ollama'>('anthropic')
  const [newAgentModel, setNewAgentModel] = useState("")
  const [newAgentConnectorConfig, setNewAgentConnectorConfig] = useState({
    apiKey: "",
    host: "",
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    numCtx: 4096
  })
  const [newAgentSystemPrompt, setNewAgentSystemPrompt] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const socket = useSocket()

  // WebSocket live updates
  useSocketSubscription(socket, 'agent', {
    'agent:status:changed': (data: { agentId: string; status: string; isActive: boolean }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId ? { ...agent, status: data.status as any, isActive: data.isActive } : agent
      ))
    },
    'agent:created': (data: { agent: Agent }) => {
      setAgents(prev => [...prev, data.agent])
    },
    'agent:deleted': (data: { agentId: string }) => {
      setAgents(prev => prev.filter(agent => agent.id !== data.agentId))
    }
  })

  // Default models for reference
  const defaultModels = {
    anthropic: 'claude-3-5-sonnet-20241022',
    openai: 'gpt-4o',
    ollama: 'qwen2.5-coder:latest'
  }

  useEffect(() => {
    // Set default model when provider changes
    setNewAgentModel(defaultModels[newAgentProvider])
    // Reset connector config when provider changes
    setNewAgentConnectorConfig({
      apiKey: "",
      host: newAgentProvider === 'ollama' ? 'http://localhost:11434' : "",
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      numCtx: 4096
    })
  }, [newAgentProvider])

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setIsLoading(true)
        const agentsData = await listAgents()
        setAgents(agentsData)
        setError(null)
      } catch (err) {
        console.error('Agent fetch error:', err);
        let errorMessage = 'Failed to fetch agents';

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null) {
          const errorObj = err as any;
          errorMessage = errorObj.message ||
                       errorObj.error ||
                       errorObj.payload?.message ||
                       errorObj.payload?.error ||
                       errorObj.statusText ||
                       'Failed to fetch agents';
        }

        setError(errorMessage)
        showToast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadAgents()

    // legacy subscription code removed

    return () => {
      if (socket) {
        // socket.emit('unsubscribe', { topic: 'agent' }) // handled by useSocketSubscription
        // socket.off('agent:status:changed')
        // socket.off('agent:created')
        // socket.off('agent:deleted')
      }
    }
  }, [socket])

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAgentName.trim()) return

    setIsCreating(true)
    try {
      const agentData: CreateAgentData = {
        name: newAgentName,
        label: newAgentLabel || newAgentName,
        description: newAgentDescription || undefined,
        color: newAgentColor,
        llmProvider: newAgentProvider,
        model: newAgentModel,
        config: {
          type: newAgentProvider,
          model: newAgentModel,
          prompts: newAgentSystemPrompt ? {
            system: newAgentSystemPrompt
          } : undefined
        },
        connectors: {
          [newAgentProvider]: {
            ...newAgentConnectorConfig,
            // Clean up empty values
            ...(newAgentConnectorConfig.apiKey ? { apiKey: newAgentConnectorConfig.apiKey } : {}),
            ...(newAgentConnectorConfig.host ? { host: newAgentConnectorConfig.host } : {}),
            maxTokens: newAgentConnectorConfig.maxTokens,
            temperature: newAgentConnectorConfig.temperature,
            topP: newAgentConnectorConfig.topP,
            frequencyPenalty: newAgentConnectorConfig.frequencyPenalty,
            presencePenalty: newAgentConnectorConfig.presencePenalty,
            ...(newAgentProvider === 'ollama' ? { numCtx: newAgentConnectorConfig.numCtx } : {})
          }
        },
        mcp: {
          enabled: true,
          servers: [
            // Include default weather MCP server
            {
              name: 'weather',
              command: 'node',
              args: ['src/managers/agent/mcp-servers/weather.js']
            }
          ]
        }
      }

      const newAgent = await createAgent(agentData)
      setAgents(prev => [...prev, newAgent])
      setNewAgentName("")
      setNewAgentDescription("")
      setNewAgentColor(generateNiceRandomHexColor())
      setNewAgentLabel("")
      setNewAgentSystemPrompt("")
      setNewAgentConnectorConfig({
        apiKey: "",
        host: newAgentProvider === 'ollama' ? 'http://localhost:11434' : "",
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        numCtx: 4096
      })
      showToast({
        title: 'Success',
        description: `Agent '${newAgent.label || newAgent.name}' created.`
      })
    } catch (err) {
      console.error('Agent creation error:', err);
      let errorMessage = 'Failed to create agent';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        errorMessage = errorObj.message ||
                     errorObj.error ||
                     errorObj.payload?.message ||
                     errorObj.payload?.error ||
                     errorObj.statusText ||
                     'Failed to create agent';
      }

      showToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartAgent = async (agentName: string) => {
    try {
      const updatedAgent = await startAgent(agentName)
      setAgents(prev => prev.map(agent => agent.name === updatedAgent.name ? updatedAgent : agent))
      showToast({
        title: 'Success',
        description: `Agent '${updatedAgent.label || updatedAgent.name}' started.`
      })
    } catch (err) {
      console.error('Agent start error:', err);
      let errorMessage = 'Failed to start agent';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        errorMessage = errorObj.message ||
                     errorObj.error ||
                     errorObj.payload?.message ||
                     errorObj.payload?.error ||
                     errorObj.statusText ||
                     'Failed to start agent';
      }

      showToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleStopAgent = async (agentName: string) => {
    try {
      await stopAgent(agentName)
      // Update agent status to inactive
      setAgents(prev => prev.map(agent =>
        agent.name === agentName ? { ...agent, status: 'inactive', isActive: false } : agent
      ))
      showToast({
        title: 'Success',
        description: `Agent '${agentName}' stopped.`
      })
    } catch (err) {
      console.error('Agent stop error:', err);
      let errorMessage = 'Failed to stop agent';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        errorMessage = errorObj.message ||
                     errorObj.error ||
                     errorObj.payload?.message ||
                     errorObj.payload?.error ||
                     errorObj.statusText ||
                     'Failed to stop agent';
      }

      showToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleEnterAgent = (agentName: string) => {
    navigate(`/agents/${agentName}`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
        <p className="text-muted-foreground mt-2">Create and manage your AI agents with multiple LLM providers</p>
      </div>

      {/* Create New Agent Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Create New Agent</h2>
        <form onSubmit={handleCreateAgent} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder="Agent Name (e.g., 'my-assistant')"
              disabled={isCreating}
            />
            <Input
              value={newAgentLabel}
              onChange={(e) => setNewAgentLabel(e.target.value)}
              placeholder="Agent Label (display name, optional)"
              disabled={isCreating}
            />
          </div>
          <Input
            value={newAgentDescription}
            onChange={(e) => setNewAgentDescription(e.target.value)}
            placeholder="Description (optional)"
            disabled={isCreating}
          />

          {/* LLM Provider and Model Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="agent-provider" className="text-sm font-medium">LLM Provider</label>
              <select
                id="agent-provider"
                value={newAgentProvider}
                onChange={(e) => setNewAgentProvider(e.target.value as 'anthropic' | 'openai' | 'ollama')}
                className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isCreating}
              >
                <option value="anthropic">Anthropic Claude</option>
                <option value="openai">OpenAI GPT</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
            </div>
            <div>
              <label htmlFor="agent-model" className="text-sm font-medium">Model</label>
              <Input
                id="agent-model"
                value={newAgentModel}
                onChange={(e) => setNewAgentModel(e.target.value)}
                placeholder="Model name (e.g., 'gpt-4o')"
                disabled={isCreating}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="system-prompt" className="text-sm font-medium">System Prompt (Optional)</label>
            <textarea
              id="system-prompt"
              value={newAgentSystemPrompt}
              onChange={(e) => setNewAgentSystemPrompt(e.target.value)}
              placeholder="Enter system prompt to define agent behavior..."
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
              disabled={isCreating}
            />
          </div>

          {/* Connector Configuration */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="api-key" className="text-sm font-medium">API Key (Optional)</label>
              <Input
                id="api-key"
                type="password"
                value={newAgentConnectorConfig.apiKey}
                onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter your API key"
                disabled={isCreating}
              />
            </div>
            <div>
              <label htmlFor="host" className="text-sm font-medium">Host (Optional)</label>
              <Input
                id="host"
                value={newAgentConnectorConfig.host}
                onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="Enter your host (e.g., http://localhost:11434)"
                disabled={isCreating}
              />
            </div>
          </div>

          {/* LLM Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">LLM Parameters</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="max-tokens" className="text-sm font-medium">Max Tokens</label>
                <Input
                  id="max-tokens"
                  type="number"
                  min="1"
                  max="32768"
                  value={newAgentConnectorConfig.maxTokens}
                  onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                  disabled={isCreating}
                />
              </div>
              <div>
                <label htmlFor="temperature" className="text-sm font-medium">Temperature</label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={newAgentConnectorConfig.temperature}
                  onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                  disabled={isCreating}
                />
              </div>
              <div>
                <label htmlFor="top-p" className="text-sm font-medium">Top P</label>
                <Input
                  id="top-p"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newAgentConnectorConfig.topP}
                  onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, topP: parseFloat(e.target.value) || 1.0 }))}
                  disabled={isCreating}
                />
              </div>
              {newAgentProvider === 'ollama' && (
                <div>
                  <label htmlFor="num-ctx" className="text-sm font-medium">Context Length</label>
                  <Input
                    id="num-ctx"
                    type="number"
                    min="1024"
                    max="32768"
                    value={newAgentConnectorConfig.numCtx}
                    onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, numCtx: parseInt(e.target.value) || 4096 }))}
                    disabled={isCreating}
                  />
                </div>
              )}
            </div>

            {newAgentProvider !== 'ollama' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="frequency-penalty" className="text-sm font-medium">Frequency Penalty</label>
                  <Input
                    id="frequency-penalty"
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={newAgentConnectorConfig.frequencyPenalty}
                    onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) || 0.0 }))}
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <label htmlFor="presence-penalty" className="text-sm font-medium">Presence Penalty</label>
                  <Input
                    id="presence-penalty"
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={newAgentConnectorConfig.presencePenalty}
                    onChange={(e) => setNewAgentConnectorConfig(prev => ({ ...prev, presencePenalty: parseFloat(e.target.value) || 0.0 }))}
                    disabled={isCreating}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="agent-color" className="text-sm font-medium">Agent Color</label>
            <Input
              id="agent-color"
              type="color"
              value={newAgentColor}
              onChange={(e) => setNewAgentColor(e.target.value)}
              className="h-10 w-16 p-1"
              disabled={isCreating}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewAgentColor(generateNiceRandomHexColor())}
              disabled={isCreating}
            >
              Randomize
            </Button>
          </div>
          <Button type="submit" disabled={isCreating || !newAgentName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </form>
      </div>

      {/* Your Agents Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Agents</h2>

        {isLoading && <p className="text-center text-muted-foreground">Loading agents...</p>}

        {error && (
          <div className="text-center text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && agents.length === 0 && (
          <p className="text-center text-muted-foreground">No agents found</p>
        )}

        {agents.length > 0 && (
          <div className="grid gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onStart={handleStartAgent}
                onStop={handleStopAgent}
                onEnter={handleEnterAgent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


