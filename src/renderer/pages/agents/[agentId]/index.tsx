import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-container'
import {
  Send,
  Play,
  Square,
  Settings,
  Brain,
  Trash,
  Wrench,
  Cpu,
  MessageCircle,
  Clock,
  Database,
  StopCircle,
  Wifi,
  WifiOff,
  Radio,
  Edit,
  Trash2
} from 'lucide-react'
import {
  getAgent,
  startAgent,
  stopAgent,
  getAgentMemory,
  clearAgentMemory,
  getAgentMCPTools,
  callMCPTool,
  deleteAgent,
  updateAgent,
  getAgentStatus,
  Agent,
  MCPTool,
  AgentMemory
} from '@/services/agent'
import { useAgentChat } from '@/hooks/useAgentChat'
import StreamingChatMessageComponent from '@/components/agent/StreamingChatMessage'

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingAgent, setIsStartingAgent] = useState(false)
  const [isStoppingAgent, setIsStoppingAgent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit and delete states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit modal form state
  const [editForm, setEditForm] = useState({
    label: '',
    description: '',
    llmProvider: 'anthropic',
    model: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    numCtx: 4096, // For Ollama
    reasoning: false // For advanced reasoning
  })
  const [isSaving, setIsSaving] = useState(false)

  // Sidebar states
  const [activeTab, setActiveTab] = useState<'info' | 'tools' | 'memory'>('info')
  const [tools, setTools] = useState<MCPTool[]>([])
  const [memory, setMemory] = useState<AgentMemory[]>([])
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null)
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({})
  const [isLoadingTools, setIsLoadingTools] = useState(false)
  const [isLoadingMemory, setIsLoadingMemory] = useState(false)
  const [isExecutingTool, setIsExecutingTool] = useState(false)

  const { showToast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Streaming chat hook
  const {
    allMessages,
    isStreaming,
    currentStreamingMessage,
    connectionStatus,
    error: chatError,
    sendMessage,
    clearMessages,
    stopStreaming
  } = useAgentChat({
    agentId: agentId || '',
    llmProvider: agent?.llmProvider, // Pass provider info for smart streaming
    onError: (error) => {
      showToast({
        title: 'Chat Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [allMessages, currentStreamingMessage])

  // Focus chat input when agent becomes active
  useEffect(() => {
    if (agent?.isActive && chatInputRef.current) {
      chatInputRef.current.focus()
    }
  }, [agent?.isActive])

  // Periodic status refresh to ensure UI stays in sync
  useEffect(() => {
    if (!agent || !agentId) return

    const refreshStatus = async () => {
      try {
        const status = await getAgentStatus(agentId)
        // Update agent state if status has changed
        if (agent.isActive !== status.isActive || agent.status !== status.status) {
          setAgent(prev => prev ? {
            ...prev,
            isActive: status.isActive,
            status: status.status as Agent['status'],
            lastAccessed: status.lastAccessed
          } : null)
        }
      } catch (err) {
        // Silently fail status refresh to avoid spamming errors
        console.warn('Status refresh failed:', err)
      }
    }

    // Refresh immediately and then every 10 seconds
    refreshStatus()
    const interval = setInterval(refreshStatus, 10000)

    return () => clearInterval(interval)
  }, [agent?.id, agentId])

  // Fetch agent details
  useEffect(() => {
    if (!agentId) return

    const fetchAgent = async () => {
      setIsLoading(true)
      try {
        const agentData = await getAgent(agentId)
        setAgent(agentData)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to fetch agent ${agentId}`
        setError(message)
        showToast({
          title: 'Error',
          description: message,
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgent()
  }, [agentId, showToast])

  // Load tools when agent is active and tools tab is selected
  useEffect(() => {
    if (agent?.isActive && activeTab === 'tools' && !isLoadingTools) {
      loadTools()
    }
  }, [agent?.isActive, activeTab])

  // Load memory when memory tab is selected
  useEffect(() => {
    if (agent?.isActive && activeTab === 'memory' && !isLoadingMemory) {
      loadMemory()
    }
  }, [agent?.isActive, activeTab])

  const loadTools = async () => {
    if (!agent?.isActive) return

    setIsLoadingTools(true)
    try {
      const toolsData = await getAgentMCPTools(agent.id)
      setTools(toolsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load MCP tools'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsLoadingTools(false)
    }
  }

  const loadMemory = async () => {
    if (!agent?.isActive) return

    setIsLoadingMemory(true)
    try {
      const memoryData = await getAgentMemory(agent.id)
      setMemory(memoryData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agent memory'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsLoadingMemory(false)
    }
  }

  const handleStartAgent = async () => {
    if (!agent) return

    setIsStartingAgent(true)
    try {
      const updatedAgent = await startAgent(agent.name)
      setAgent(updatedAgent)
      showToast({
        title: 'Success',
        description: 'Agent started successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start agent'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsStartingAgent(false)
    }
  }

  const handleStopAgent = async () => {
    if (!agent) return

    setIsStoppingAgent(true)
    try {
      await stopAgent(agent.name)
      setAgent(prev => prev ? { ...prev, status: 'inactive', isActive: false } : null)
      clearMessages() // Clear messages on agent stop
      showToast({
        title: 'Success',
        description: 'Agent stopped successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop agent'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsStoppingAgent(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMessage.trim() || !agent?.isActive || isStreaming) return

    try {
      await sendMessage(currentMessage, {
        mcpContext: true
      })
      setCurrentMessage('')
    } catch (err) {
      // Error handling is done by the useAgentChat hook
      console.error('Failed to send message:', err)
    }
  }

  const handleStopStreaming = () => {
    stopStreaming()
    showToast({
      title: 'Streaming Stopped',
      description: 'Chat streaming has been stopped',
    })
  }

  const getConnectionStatusDisplay = () => {
    const icons = {
      websocket: <Wifi className="h-4 w-4 text-green-500" />,
      sse: <Radio className="h-4 w-4 text-blue-500" />,
      rest: <Cpu className="h-4 w-4 text-yellow-500" />,
      disconnected: <WifiOff className="h-4 w-4 text-red-500" />
    }

    const getStatusLabel = () => {
      switch (connectionStatus) {
        case 'websocket':
          return 'WebSocket';
        case 'sse':
          return agent?.llmProvider === 'ollama' ? 'SSE (Ollama)' : 'SSE Fallback';
        case 'rest':
          return 'REST API';
        default:
          return 'Disconnected';
      }
    }

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icons[connectionStatus]}
        <span>{getStatusLabel()}</span>
      </div>
    )
  }

  const handleExecuteTool = async () => {
    if (!selectedTool || !agent?.isActive || isExecutingTool) return

    setIsExecutingTool(true)
    try {
      const result = await callMCPTool(agent.id, selectedTool.name, toolArgs, selectedTool.source)

      // Show toast for tool execution with result summary
      const resultSummary = result.content && result.content.length > 0
        ? result.content.map((c: any) => c.text || 'Result').join(', ').substring(0, 100)
        : 'Executed successfully'

      showToast({
        title: 'Success',
        description: `Tool "${selectedTool.name}" executed: ${resultSummary}`
      })
      setSelectedTool(null)
      setToolArgs({})

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute tool'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsExecutingTool(false)
    }
  }

  const handleClearMemory = async () => {
    if (!agent?.isActive || !confirm('Are you sure you want to clear all agent memory?')) return

    try {
      await clearAgentMemory(agent.id)
      setMemory([])
      showToast({
        title: 'Success',
        description: 'Agent memory cleared successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear memory'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const handleDeleteAgent = async () => {
    if (!agent) return

    setIsDeleting(true)
    try {
      await deleteAgent(agent.id)
      showToast({
        title: 'Success',
        description: 'Agent deleted successfully'
      })
      // Navigate back to agents list
      window.location.href = '/agents'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete agent'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleEditAgent = () => {
    if (!agent) return

    // Initialize form with current agent values
    setEditForm({
      label: agent.label || agent.name,
      description: agent.description || '',
      llmProvider: agent.llmProvider || 'anthropic',
      model: agent.model || '',
      systemPrompt: agent.config?.prompts?.system || '',
      temperature: agent.config?.connectors?.[agent.llmProvider]?.temperature || 0.7,
      maxTokens: agent.config?.connectors?.[agent.llmProvider]?.maxTokens || 4096,
      topP: agent.config?.connectors?.[agent.llmProvider]?.topP || 1.0,
      frequencyPenalty: agent.config?.connectors?.[agent.llmProvider]?.frequencyPenalty || 0.0,
      presencePenalty: agent.config?.connectors?.[agent.llmProvider]?.presencePenalty || 0.0,
      numCtx: agent.config?.connectors?.[agent.llmProvider]?.numCtx || 4096,
      reasoning: agent.config?.connectors?.[agent.llmProvider]?.reasoning || false
    })
    setShowEditModal(true)
  }

  const handleSaveAgent = async () => {
    if (!agent) return

    setIsSaving(true)
    try {
      // Prepare the update data
      const updateData = {
        label: editForm.label,
        description: editForm.description,
        llmProvider: editForm.llmProvider as 'anthropic' | 'openai' | 'ollama',
        model: editForm.model,
        prompts: {
          system: editForm.systemPrompt
        },
        connectors: {
          [editForm.llmProvider]: {
            temperature: editForm.temperature,
            maxTokens: editForm.maxTokens,
            topP: editForm.topP,
            frequencyPenalty: editForm.frequencyPenalty,
            presencePenalty: editForm.presencePenalty,
            numCtx: editForm.numCtx,
            reasoning: editForm.reasoning
          }
        }
      }

      await updateAgent(agent.id, updateData)

      showToast({
        title: 'Success',
        description: 'Agent updated successfully'
      })

      // Refresh agent data
      const agentData = await getAgent(agent.id)
      setAgent(agentData)
      setShowEditModal(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update agent'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderToolArgumentInput = (argName: string, schema: any) => {
    const value = toolArgs[argName] || ''

    const handleChange = (newValue: any) => {
      setToolArgs(prev => ({ ...prev, [argName]: newValue }))
    }

    if (schema.type === 'boolean') {
      return (
        <div key={argName} className="space-y-2">
          <label className="text-sm font-medium">{argName}</label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleChange(e.target.checked)}
            className="rounded"
          />
          {schema.description && (
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          )}
        </div>
      )
    }

    if (schema.enum) {
      return (
        <div key={argName} className="space-y-2">
          <label className="text-sm font-medium">{argName}</label>
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="">Select...</option>
            {schema.enum.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {schema.description && (
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          )}
        </div>
      )
    }

    return (
      <div key={argName} className="space-y-2">
        <label className="text-sm font-medium">{argName}</label>
        <Input
          type={schema.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => handleChange(schema.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          placeholder={schema.description || `Enter ${argName}`}
        />
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading agent...</p>
        </div>
      </div>
    )
  }

  if (error && !agent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-destructive">Error: {error}</div>
      </div>
    )
  }

  if (!agent) {
    return <div className="text-center">Agent not found.</div>
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg">
        {/* Agent Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
              style={{ backgroundColor: agent.color || '#6366f1', borderColor: agent.color || '#6366f1' }}
            >
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{agent.label || agent.name}</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {agent.llmProvider} • {agent.model} •
                  <span className={`ml-1 ${agent.isActive ? 'text-green-600' : 'text-yellow-600'}`}>
                    {agent.status}
                  </span>
                </p>
                {agent.isActive && getConnectionStatusDisplay()}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {isStreaming && (
              <Button
                onClick={handleStopStreaming}
                size="sm"
                variant="outline"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}

            <Button
              onClick={handleEditAgent}
              size="sm"
              variant="outline"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <Button
              onClick={() => setShowDeleteConfirm(true)}
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>

            {!agent.isActive ? (
              <Button
                onClick={handleStartAgent}
                disabled={isStartingAgent}
                size="sm"
              >
                <Play className="mr-2 h-4 w-4" />
                {isStartingAgent ? 'Starting...' : 'Start'}
              </Button>
            ) : (
              <Button
                onClick={handleStopAgent}
                disabled={isStoppingAgent}
                variant="outline"
                size="sm"
              >
                <Square className="mr-2 h-4 w-4" />
                {isStoppingAgent ? 'Stopping...' : 'Stop'}
              </Button>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!agent.isActive ? (
            <div className="text-center text-muted-foreground py-8">
              <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Agent is not active. Start the agent to begin chatting.</p>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start a conversation with your agent!</p>
              <p className="text-xs mt-2">
                {agent?.llmProvider === 'ollama'
                  ? 'Using optimized SSE streaming for Ollama'
                  : `Using ${connectionStatus === 'websocket' ? 'real-time WebSocket' :
                      connectionStatus === 'sse' ? 'Server-Sent Events' :
                      'REST API'} for communication`
                }
              </p>
            </div>
          ) : (
            allMessages.map((message, index) => (
              <StreamingChatMessageComponent
                key={`${message.timestamp}-${index}`}
                message={message}
                isStreaming={isStreaming && message === currentStreamingMessage}
                connectionStatus={connectionStatus}
              />
            ))
          )}

          {chatError && (
            <div className="text-center text-destructive p-4 bg-destructive/10 rounded-lg">
              <p className="font-medium">Chat Error</p>
              <p className="text-sm mt-1">{chatError}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            {/* Chat is always available regardless of agent status - only streaming disables input */}
            <Input
              ref={chatInputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder={isStreaming ? "Streaming in progress..." : "Type a message..."}
              disabled={isStreaming}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!currentMessage.trim() || isStreaming}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                {allMessages.length} message{allMessages.length !== 1 ? 's' : ''}
              </span>
              {allMessages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="text-destructive hover:underline"
                  disabled={isStreaming}
                >
                  Clear chat
                </button>
              )}
            </div>
            {getConnectionStatusDisplay()}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border rounded-lg">
        {/* Sidebar Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 p-3 text-sm font-medium border-r ${
              activeTab === 'info' ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
          >
            <Settings className="h-4 w-4 mx-auto mb-1" />
            Info
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex-1 p-3 text-sm font-medium border-r ${
              activeTab === 'tools' ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
            disabled={!agent.isActive}
          >
            <Wrench className="h-4 w-4 mx-auto mb-1" />
            Tools
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex-1 p-3 text-sm font-medium ${
              activeTab === 'memory' ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
            disabled={!agent.isActive}
          >
            <Database className="h-4 w-4 mx-auto mb-1" />
            Memory
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="p-4 h-[calc(100%-57px)] overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Agent Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>
                    <span className="ml-2 font-mono">{agent.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Label:</span>
                    <span className="ml-2">{agent.label || 'None'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Provider:</span>
                    <span className="ml-2 capitalize">{agent.llmProvider}</span>
                  </div>
                  <div>
                    <span className="font-medium">Model:</span>
                    <span className="ml-2 font-mono text-xs">{agent.model}</span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2">{agent.status}</span>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <span className="ml-2">{new Date(agent.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {agent.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </div>
              )}

              {agent.config.mcp?.servers && agent.config.mcp.servers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">MCP Servers</h4>
                  <div className="space-y-2">
                    {agent.config.mcp.servers.map((server, index) => (
                      <div key={index} className="p-2 bg-muted rounded text-sm">
                        <div className="font-medium">{server.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {server.command} {server.args ? server.args.join(' ') : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">MCP Tools</h3>
                <Button onClick={loadTools} size="sm" variant="outline" disabled={isLoadingTools}>
                  {isLoadingTools ? 'Loading...' : 'Refresh'}
                </Button>
              </div>

              {selectedTool ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{selectedTool.title || selectedTool.name}</h4>
                    <Button onClick={() => setSelectedTool(null)} size="sm" variant="ghost">
                      ×
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">{selectedTool.description}</p>

                  <div className="space-y-3">
                    {selectedTool.inputSchema && typeof selectedTool.inputSchema === 'object' && selectedTool.inputSchema.properties ? (
                      Object.entries(selectedTool.inputSchema.properties).map(([argName, schema]) =>
                        renderToolArgumentInput(argName, schema)
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">No arguments required</p>
                    )}
                  </div>

                  <Button
                    onClick={handleExecuteTool}
                    disabled={isExecutingTool}
                    className="w-full"
                  >
                    {isExecutingTool ? 'Executing...' : 'Execute Tool'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {isLoadingTools ? (
                    <div className="text-center text-muted-foreground">Loading tools...</div>
                  ) : tools.length === 0 ? (
                    <div className="text-center text-muted-foreground">No tools available</div>
                  ) : (
                    tools.map((tool) => (
                      <button
                        key={`${tool.source}-${tool.name}`}
                        onClick={() => setSelectedTool(tool)}
                        className="w-full p-3 text-left border rounded hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium text-sm">{tool.title || tool.name}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Source: {tool.source}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Agent Memory</h3>
                <div className="flex gap-2">
                  <Button onClick={loadMemory} size="sm" variant="outline" disabled={isLoadingMemory}>
                    {isLoadingMemory ? 'Loading...' : 'Refresh'}
                  </Button>
                  <Button onClick={handleClearMemory} size="sm" variant="outline">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {isLoadingMemory ? (
                  <div className="text-center text-muted-foreground">Loading memory...</div>
                ) : memory.length === 0 ? (
                  <div className="text-center text-muted-foreground">No memory entries</div>
                ) : (
                  memory.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="p-3 border rounded text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown time'}
                        </span>
                      </div>
                      {entry.user_message && (
                        <div className="mb-1">
                          <span className="font-medium text-xs">User:</span>
                          <div className="text-xs">{entry.user_message}</div>
                        </div>
                      )}
                      {entry.agent_response && (
                        <div>
                          <span className="font-medium text-xs">Agent:</span>
                          <div className="text-xs">{entry.agent_response}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Agent Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[800px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Agent Configuration</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basic Settings</h3>

                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <Input
                    value={editForm.label}
                    onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Agent display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Agent description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">LLM Provider</label>
                  <select
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={editForm.llmProvider}
                    onChange={(e) => setEditForm(prev => ({ ...prev, llmProvider: e.target.value }))}
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Model</label>
                  <Input
                    value={editForm.model}
                    onChange={(e) => setEditForm(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Model name (e.g., claude-3-5-sonnet-20241022)"
                  />
                </div>
              </div>

              {/* LLM Parameters */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">LLM Parameters</h3>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Temperature: {editForm.temperature}
                    <span className="text-xs text-muted-foreground ml-1">(0.0 - 2.0)</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={editForm.temperature}
                    onChange={(e) => setEditForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls randomness. Lower = more focused, Higher = more creative
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Tokens</label>
                  <Input
                    type="number"
                    min="1"
                    max="32768"
                    value={editForm.maxTokens}
                    onChange={(e) => setEditForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    placeholder="4096"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Top P: {editForm.topP}
                    <span className="text-xs text-muted-foreground ml-1">(0.0 - 1.0)</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={editForm.topP}
                    onChange={(e) => setEditForm(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nucleus sampling. Controls diversity via probability mass
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Frequency Penalty: {editForm.frequencyPenalty}
                    <span className="text-xs text-muted-foreground ml-1">(-2.0 - 2.0)</span>
                  </label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={editForm.frequencyPenalty}
                    onChange={(e) => setEditForm(prev => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Reduces repetition of frequent tokens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Presence Penalty: {editForm.presencePenalty}
                    <span className="text-xs text-muted-foreground ml-1">(-2.0 - 2.0)</span>
                  </label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={editForm.presencePenalty}
                    onChange={(e) => setEditForm(prev => ({ ...prev, presencePenalty: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Reduces repetition of topics
                  </p>
                </div>

                {editForm.llmProvider === 'ollama' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Context Window (num_ctx)</label>
                    <Input
                      type="number"
                      min="512"
                      max="32768"
                      value={editForm.numCtx}
                      onChange={(e) => setEditForm(prev => ({ ...prev, numCtx: parseInt(e.target.value) }))}
                      placeholder="4096"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ollama-specific: Maximum context window size
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reasoning"
                    checked={editForm.reasoning}
                    onChange={(e) => setEditForm(prev => ({ ...prev, reasoning: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="reasoning" className="text-sm font-medium">
                    Enable Advanced Reasoning
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enables step-by-step reasoning for complex tasks
                </p>
              </div>
            </div>

            {/* System Prompt */}
            <div className="mt-6">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">System Prompt</h3>
              <div className="space-y-2">
                <textarea
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm font-mono"
                  rows={8}
                  value={editForm.systemPrompt}
                  onChange={(e) => setEditForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder="You are a helpful AI assistant. You are knowledgeable, creative, and always try to provide accurate and helpful responses..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt defines the agent's personality and behavior. It will be combined with internal Canvas system prompts.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAgent}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h2 className="text-lg font-semibold mb-4 text-destructive">Delete Agent</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Are you sure you want to delete <strong>{agent.label || agent.name}</strong>?
            This action cannot be undone and will permanently remove the agent and all its data.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              variant="outline"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAgent}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Agent'}
            </Button>
          </div>
                 </div>
       </div>
     )}
    </div>
  )
}
