export const APP_NAME = 'Canvas';
export const APP_VERSION = '2.0.0-alpha.1';

// Window dimensions
export const TOOLBOX_WIDTH = 640;
export const TOOLBOX_MARGIN_RIGHT = 460;

// Calculate toolbox height as 80% of screen height
export const getToolboxHeight = () => {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  return Math.floor(primaryDisplay.workAreaSize.height * 0.8);
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
  GET_CONVERSATIONS: 'get-conversations',
  SAVE_CONVERSATION: 'save-conversation',
  DELETE_CONVERSATION: 'delete-conversation',
  SEND_MESSAGE: 'send-message',
  OPEN_TOOLBOX: 'open-toolbox',
  CLOSE_TOOLBOX: 'close-toolbox',
  GET_AUTH_SESSION: 'get-auth-session',
  SET_AUTH_SESSION: 'set-auth-session',
  CLEAR_AUTH_SESSION: 'clear-auth-session',
} as const;
