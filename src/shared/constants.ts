import { join } from 'path';
import { homedir } from 'os';

export const APP_NAME = 'Canvas';
export const APP_VERSION = '2.0.0-alpha.1';

// Window dimensions
export const TOOLBOX_WIDTH = 640;
export const TOOLBOX_HEIGHT = Math.floor(TOOLBOX_WIDTH / Math.sqrt(2)); // 1:√2 ratio ≈ 452px
export const TOOLBOX_MARGIN_RIGHT = 460;

// Data storage paths
export const getDataPath = (): string => {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || homedir(), 'Canvas', 'electron');
  }
  return join(homedir(), '.canvas', 'electron');
};

export const getAgentsPath = (): string => {
  return join(getDataPath(), 'agents');
};

export const getAgentPath = (agentName: string): string => {
  return join(getAgentsPath(), agentName);
};

// Default agent configuration
export const DEFAULT_AGENT_CONFIG = {
  name: 'Default Agent',
  systemPrompt: 'You are a helpful AI assistant.',
  runtime: 'ollama' as const,
  apiUrl: 'http://localhost:11434',
  apiToken: '',
  model: 'llama3.2',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  mcpTools: []
};

// IPC channel names
export const IPC_CHANNELS = {
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_CONVERSATIONS: 'get-conversations',
  SAVE_CONVERSATION: 'save-conversation',
  DELETE_CONVERSATION: 'delete-conversation',
  SEND_MESSAGE: 'send-message',
  OPEN_TOOLBOX: 'open-toolbox',
  CLOSE_TOOLBOX: 'close-toolbox',
  OPEN_SETTINGS: 'open-settings',
  CLOSE_SETTINGS: 'close-settings',
} as const;