import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { IPC } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: IPC = {
  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  
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
  openSettings: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_SETTINGS),
  closeSettings: () => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_SETTINGS),
};

contextBridge.exposeInMainWorld('electronAPI', api);

// TypeScript declaration for the exposed API
declare global {
  interface Window {
    electronAPI: IPC;
  }
}