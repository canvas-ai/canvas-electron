"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const constants_1 = require("../shared/constants");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.GET_SETTINGS),
    saveSettings: (settings) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.SAVE_SETTINGS, settings),
    // Conversations
    getConversations: (agentName) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.GET_CONVERSATIONS, agentName),
    saveConversation: (conversation) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.SAVE_CONVERSATION, conversation),
    deleteConversation: (conversationId, agentName) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.DELETE_CONVERSATION, conversationId, agentName),
    // Chat
    sendMessage: (message, agentConfig) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.SEND_MESSAGE, message, agentConfig),
    // Window management
    openToolbox: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.OPEN_TOOLBOX),
    closeToolbox: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.CLOSE_TOOLBOX),
    openSettings: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.OPEN_SETTINGS),
    closeSettings: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.CLOSE_SETTINGS),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
//# sourceMappingURL=preload.js.map