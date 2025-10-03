"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// IPC channel names (inlined to avoid module loading issues in sandbox)
const IPC_CHANNELS = {
    GET_CONVERSATIONS: 'get-conversations',
    SAVE_CONVERSATION: 'save-conversation',
    DELETE_CONVERSATION: 'delete-conversation',
    SEND_MESSAGE: 'send-message',
    OPEN_TOOLBOX: 'open-toolbox',
    CLOSE_TOOLBOX: 'close-toolbox',
};
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
    // Conversations
    getConversations: (agentName) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.GET_CONVERSATIONS, agentName),
    saveConversation: (conversation) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONVERSATION, conversation),
    deleteConversation: (conversationId, agentName) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DELETE_CONVERSATION, conversationId, agentName),
    // Chat
    sendMessage: (message, agentConfig) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SEND_MESSAGE, message, agentConfig),
    // Window management
    openToolbox: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPEN_TOOLBOX),
    closeToolbox: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.CLOSE_TOOLBOX),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
//# sourceMappingURL=preload.js.map