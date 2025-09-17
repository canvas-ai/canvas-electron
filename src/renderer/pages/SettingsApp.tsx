import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Save } from 'lucide-react'
import { AgentConfig, AppSettings, MCPTool } from '../../shared/types'
import { DEFAULT_AGENT_CONFIG } from '../../shared/constants'

export function SettingsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [currentAgent, setCurrentAgent] = useState<AgentConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const appSettings = await window.electronAPI.getSettings()
      setSettings(appSettings)
      
      // Select the default agent or first available
      const defaultAgentName = appSettings.defaultAgent || appSettings.agents[0]?.name
      if (defaultAgentName) {
        setSelectedAgent(defaultAgentName)
        const agent = appSettings.agents.find(a => a.name === defaultAgentName)
        if (agent) {
          setCurrentAgent({ ...agent })
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings || !currentAgent) return

    try {
      setIsSaving(true)
      
      // Update the agent in settings
      const updatedAgents = settings.agents.map(agent =>
        agent.name === selectedAgent ? currentAgent : agent
      )

      const updatedSettings = {
        ...settings,
        agents: updatedAgents,
      }

      await window.electronAPI.saveSettings(updatedSettings)
      setSettings(updatedSettings)
      
      // Show success message (you could add a toast here)
      console.log('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const createNewAgent = () => {
    if (!settings) return

    const newAgent: AgentConfig = {
      ...DEFAULT_AGENT_CONFIG,
      name: `Agent ${settings.agents.length + 1}`,
    }

    const updatedSettings = {
      ...settings,
      agents: [...settings.agents, newAgent],
    }

    setSettings(updatedSettings)
    setSelectedAgent(newAgent.name)
    setCurrentAgent({ ...newAgent })
  }

  const deleteAgent = () => {
    if (!settings || !currentAgent || settings.agents.length <= 1) return

    const updatedAgents = settings.agents.filter(agent => agent.name !== currentAgent.name)
    const updatedSettings = {
      ...settings,
      agents: updatedAgents,
      defaultAgent: settings.defaultAgent === currentAgent.name ? updatedAgents[0]?.name : settings.defaultAgent,
    }

    setSettings(updatedSettings)
    setSelectedAgent(updatedAgents[0]?.name || '')
    setCurrentAgent(updatedAgents[0] ? { ...updatedAgents[0] } : null)
  }

  const selectAgent = (agentName: string) => {
    if (!settings) return

    const agent = settings.agents.find(a => a.name === agentName)
    if (agent) {
      setSelectedAgent(agentName)
      setCurrentAgent({ ...agent })
    }
  }

  const updateAgent = (updates: Partial<AgentConfig>) => {
    if (!currentAgent) return
    setCurrentAgent({ ...currentAgent, ...updates })
  }

  const addMCPTool = () => {
    if (!currentAgent) return

    const newTool: MCPTool = {
      name: 'New Tool',
      enabled: true,
      config: {},
    }

    updateAgent({
      mcpTools: [...currentAgent.mcpTools, newTool],
    })
  }

  const removeMCPTool = (index: number) => {
    if (!currentAgent) return

    const updatedTools = currentAgent.mcpTools.filter((_, i) => i !== index)
    updateAgent({ mcpTools: updatedTools })
  }

  const updateMCPTool = (index: number, updates: Partial<MCPTool>) => {
    if (!currentAgent) return

    const updatedTools = currentAgent.mcpTools.map((tool, i) =>
      i === index ? { ...tool, ...updates } : tool
    )
    updateAgent({ mcpTools: updatedTools })
  }

  if (isLoading || !settings || !currentAgent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">Settings</h1>
        <div className="flex gap-2">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Agent Selection Sidebar */}
        <div className="w-64 border-r bg-muted/20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Agents</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={createNewAgent}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {settings.agents.map((agent) => (
                <Button
                  key={agent.name}
                  variant={selectedAgent === agent.name ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => selectAgent(agent.name)}
                >
                  {agent.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Basic Settings
                  {settings.agents.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteAgent}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    value={currentAgent.name}
                    onChange={(e) => updateAgent({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System Prompt</Label>
                  <Textarea
                    id="system-prompt"
                    value={currentAgent.systemPrompt}
                    onChange={(e) => updateAgent({ systemPrompt: e.target.value })}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="runtime">Runtime</Label>
                  <Select
                    value={currentAgent.runtime}
                    onValueChange={(value: 'ollama' | 'openai' | 'anthropic') => 
                      updateAgent({ runtime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-url">API URL</Label>
                  <Input
                    id="api-url"
                    value={currentAgent.apiUrl}
                    onChange={(e) => updateAgent({ apiUrl: e.target.value })}
                    placeholder={
                      currentAgent.runtime === 'ollama' 
                        ? 'http://localhost:11434' 
                        : currentAgent.runtime === 'openai'
                        ? 'https://api.openai.com/v1'
                        : 'https://api.anthropic.com'
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-token">API Token</Label>
                  <Input
                    id="api-token"
                    type="password"
                    value={currentAgent.apiToken}
                    onChange={(e) => updateAgent({ apiToken: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={currentAgent.model}
                    onChange={(e) => updateAgent({ model: e.target.value })}
                    placeholder={
                      currentAgent.runtime === 'ollama' 
                        ? 'llama3.2' 
                        : currentAgent.runtime === 'openai'
                        ? 'gpt-4'
                        : 'claude-3-sonnet-20240229'
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Model Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Model Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">
                      {currentAgent.temperature}
                    </span>
                  </div>
                  <Slider
                    value={[currentAgent.temperature]}
                    onValueChange={([value]) => updateAgent({ temperature: value })}
                    max={2}
                    min={0}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Top P</Label>
                    <span className="text-sm text-muted-foreground">
                      {currentAgent.topP}
                    </span>
                  </div>
                  <Slider
                    value={[currentAgent.topP]}
                    onValueChange={([value]) => updateAgent({ topP: value })}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Max Tokens</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={currentAgent.maxTokens || 2048}
                    onChange={(e) => updateAgent({ maxTokens: parseInt(e.target.value) || 2048 })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* MCP Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  MCP Tools
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addMCPTool}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentAgent.mcpTools.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No MCP tools configured
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentAgent.mcpTools.map((tool, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded">
                        <Input
                          value={tool.name}
                          onChange={(e) => updateMCPTool(index, { name: e.target.value })}
                          placeholder="Tool name"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMCPTool(index, { enabled: !tool.enabled })}
                        >
                          {tool.enabled ? 'Enabled' : 'Disabled'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMCPTool(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}