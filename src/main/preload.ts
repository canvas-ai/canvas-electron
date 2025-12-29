import { contextBridge, ipcRenderer } from 'electron';
import type { IPC } from '../shared/types';

// IPC channel names (inlined to avoid module loading issues in sandbox)
const IPC_CHANNELS = {
  GET_CONVERSATIONS: 'get-conversations',
  SAVE_CONVERSATION: 'save-conversation',
  DELETE_CONVERSATION: 'delete-conversation',
  SEND_MESSAGE: 'send-message',
  OPEN_TOOLBOX: 'open-toolbox',
  CLOSE_TOOLBOX: 'close-toolbox',
  GET_AUTH_SESSION: 'get-auth-session',
  SET_AUTH_SESSION: 'set-auth-session',
  CLEAR_AUTH_SESSION: 'clear-auth-session',
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window-toggle-maximize',
  WINDOW_CLOSE: 'window-close',
  APP_QUIT: 'app-quit',
} as const;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: IPC = {
  // Conversations
  getConversations: (agentName) => ipcRenderer.invoke(IPC_CHANNELS.GET_CONVERSATIONS, agentName),
  saveConversation: (conversation) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONVERSATION, conversation),
  deleteConversation: (conversationId, agentName) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CONVERSATION, conversationId, agentName),

  // Chat
  sendMessage: (message, agentConfig) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_MESSAGE, message, agentConfig),

  // Window management
  openToolbox: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_TOOLBOX),
  closeToolbox: () => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_TOOLBOX),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  toggleMaximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  quitApp: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),

  // Auth
  getAuthSession: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTH_SESSION),
  setAuthSession: (session) => ipcRenderer.invoke(IPC_CHANNELS.SET_AUTH_SESSION, session),
  clearAuthSession: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_AUTH_SESSION),
};

contextBridge.exposeInMainWorld('electronAPI', api);

// TypeScript declaration for the exposed API
declare global {
  interface Window {
    electronAPI: IPC;
  }
}
