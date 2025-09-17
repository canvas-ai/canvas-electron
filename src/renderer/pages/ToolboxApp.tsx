import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Settings, Send, Paperclip, Mic, Image } from 'lucide-react'
import { ChatMessage, Conversation, AgentConfig, AppSettings } from '../../shared/types'
import { v4 as uuidv4 } from 'uuid'

export function ToolboxApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [currentAgent, setCurrentAgent] = useState<AgentConfig | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      const appSettings = await window.electronAPI.getSettings()
      setSettings(appSettings)
      
      // Get default agent
      const defaultAgent = appSettings.agents.find(a => a.name === appSettings.defaultAgent) || appSettings.agents[0]
      if (defaultAgent) {
        setCurrentAgent(defaultAgent)
        loadConversations(defaultAgent.name)
      }
    } catch (error) {
      console.error('Failed to initialize app:', error)
    }
  }

  const loadConversations = async (agentName: string) => {
    try {
      const convs = await window.electronAPI.getConversations(agentName)
      setConversations(convs)
      
      // If no current conversation, create a new one
      if (!currentConversation) {
        createNewConversation(agentName)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const createNewConversation = (agentName: string) => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: 'New Conversation',
      agentName,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setCurrentConversation(newConversation)
  }

  const sendMessage = async () => {
    if (!message.trim() || !currentAgent || !currentConversation || isLoading) return

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    }

    // Add user message to conversation
    const updatedConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      updatedAt: new Date(),
    }

    setCurrentConversation(updatedConversation)
    setMessage('')
    setIsLoading(true)

    try {
      // Send message to AI
      const assistantMessage = await window.electronAPI.sendMessage(userMessage, currentAgent)
      
      // Add assistant response
      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage],
        updatedAt: new Date(),
      }

      // Update title if this is the first message
      if (finalConversation.title === 'New Conversation' && userMessage.content) {
        finalConversation.title = userMessage.content.substring(0, 30) + 
          (userMessage.content.length > 30 ? '...' : '')
      }

      setCurrentConversation(finalConversation)
      
      // Save conversation
      await window.electronAPI.saveConversation(finalConversation)
      
      // Refresh conversations list
      if (currentAgent) {
        loadConversations(currentAgent.name)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // TODO: Show error message to user
    } finally {
      setIsLoading(false)
    }
  }

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation)
  }

  const openSettings = () => {
    window.electronAPI.openSettings()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!settings || !currentAgent) {
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
        <h1 className="text-lg font-semibold">{currentAgent.name}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={openSettings}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-48 border-r bg-muted/20">
          <div className="p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => currentAgent && createNewConversation(currentAgent.name)}
            >
              New Chat
            </Button>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  variant={currentConversation?.id === conversation.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto p-2"
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="truncate text-xs">
                    {conversation.title}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {currentConversation?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card className={`max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <CardContent className="p-3">
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="bg-muted">
                    <CardContent className="p-3">
                      <div className="text-sm">Thinking...</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  title="Attach file (coming soon)"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  title="Voice input (coming soon)"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  title="Image input (coming soon)"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}