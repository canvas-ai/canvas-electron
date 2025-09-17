export interface AgentConfig {
  name: string;
  systemPrompt: string;
  runtime: 'ollama' | 'openai' | 'anthropic';
  apiUrl: string;
  apiToken: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens?: number;
  mcpTools: MCPTool[];
}

export interface MCPTool {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'image' | 'file' | 'audio';
  name: string;
  data: string; // base64 encoded
  mimeType: string;
}

export interface Conversation {
  id: string;
  title: string;
  agentName: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  agents: AgentConfig[];
  defaultAgent?: string;
  windowSettings: {
    toolboxWidth: number;
    toolboxHeight: number;
    toolboxMarginRight: number;
  };
}

export interface IPC {
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  
  // Conversations
  getConversations: (agentName: string) => Promise<Conversation[]>;
  saveConversation: (conversation: Conversation) => Promise<void>;
  deleteConversation: (conversationId: string, agentName: string) => Promise<void>;
  
  // Chat
  sendMessage: (message: ChatMessage, agentConfig: AgentConfig) => Promise<ChatMessage>;
  
  // Window management
  openToolbox: () => Promise<void>;
  closeToolbox: () => Promise<void>;
  openSettings: () => Promise<void>;
  closeSettings: () => Promise<void>;
}