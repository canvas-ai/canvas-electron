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

export type AuthSession = {
  serverUrl: string;
  apiUrl: string;
  token: string;
};

export interface IPC {
  // Conversations
  getConversations: (agentName: string) => Promise<Conversation[]>;
  saveConversation: (conversation: Conversation) => Promise<void>;
  deleteConversation: (conversationId: string, agentName: string) => Promise<void>;

  // Chat
  sendMessage: (message: ChatMessage, agentConfig: AgentConfig) => Promise<ChatMessage>;

  // Window management
  openToolbox: () => Promise<void>;
  closeToolbox: () => Promise<void>;

  // Auth
  getAuthSession: () => Promise<AuthSession | null>;
  setAuthSession: (session: AuthSession) => Promise<void>;
  clearAuthSession: () => Promise<void>;
}
