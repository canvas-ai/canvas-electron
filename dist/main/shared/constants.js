"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = exports.DEFAULT_AGENT_CONFIG = exports.getToolboxHeight = exports.TOOLBOX_MARGIN_RIGHT = exports.TOOLBOX_WIDTH = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = 'Canvas';
exports.APP_VERSION = '2.0.0-alpha.1';
// Window dimensions
exports.TOOLBOX_WIDTH = 640;
exports.TOOLBOX_MARGIN_RIGHT = 460;
// Calculate toolbox height as 80% of screen height
const getToolboxHeight = () => {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    return Math.floor(primaryDisplay.workAreaSize.height * 0.8);
};
exports.getToolboxHeight = getToolboxHeight;
// Default agent configuration
exports.DEFAULT_AGENT_CONFIG = {
    name: 'Default Agent',
    systemPrompt: 'You are a helpful AI assistant.',
    runtime: 'ollama',
    apiUrl: 'http://localhost:11434',
    apiToken: '',
    model: 'llama3.2',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    mcpTools: []
};
// IPC channel names
exports.IPC_CHANNELS = {
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
};
//# sourceMappingURL=constants.js.map