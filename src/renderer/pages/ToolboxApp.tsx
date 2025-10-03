import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Send, Plus, Trash2, Bot, User } from 'lucide-react'
import { ChatMessage, Conversation } from '../../shared/types'
import { v4 as uuidv4 } from 'uuid'

export function ToolboxApp() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      // Create a default conversation
      createNewConversation()
    } catch (error) {
      console.error('Failed to initialize app:', error)
    }
  }

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: 'New Conversation',
      agentName: 'Default Agent',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setCurrentConversation(newConversation)
    setConversations(prev => [newConversation, ...prev])
  }

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId))
    if (currentConversation?.id === conversationId) {
      if (conversations.length > 1) {
        const remaining = conversations.filter(conv => conv.id !== conversationId)
        setCurrentConversation(remaining[0])
      } else {
        createNewConversation()
      }
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !currentConversation || isLoading) return

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
      // Simulate AI response for now
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `I received your message: "${userMessage.content}". This is a placeholder response.`,
        timestamp: new Date(),
      }

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

      // Update conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === finalConversation.id ? finalConversation : conv
        )
      )
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!currentConversation) {
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
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Canvas Toolbox</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={createNewConversation}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-64 border-r bg-muted/20">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${
                    currentConversation?.id === conversation.id ? "bg-muted" : ""
                  }`}
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">
                      {conversation.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {conversation.messages.length} messages
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conversation.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {currentConversation?.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Welcome to Canvas Toolbox</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a conversation by typing a message below
                  </p>
                </div>
              )}
              {currentConversation?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <Card className={`${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <CardContent className="p-3">
                        <div className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </CardContent>
                    </Card>
                    <div className={`text-xs text-muted-foreground mt-1 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
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
          <div className="p-4 border-t bg-background">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="min-h-[40px]"
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!message.trim() || isLoading}
                size="icon"
                className="h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
