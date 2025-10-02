"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = exports.DEFAULT_AGENT_CONFIG = exports.getAgentPath = exports.getAgentsPath = exports.getDataPath = exports.TOOLBOX_MARGIN_RIGHT = exports.TOOLBOX_HEIGHT = exports.TOOLBOX_WIDTH = exports.APP_VERSION = exports.APP_NAME = void 0;
const path_1 = require("path");
const os_1 = require("os");
exports.APP_NAME = 'Canvas';
exports.APP_VERSION = '2.0.0-alpha.1';
// Window dimensions
exports.TOOLBOX_WIDTH = 640;
exports.TOOLBOX_HEIGHT = Math.floor(exports.TOOLBOX_WIDTH / Math.sqrt(2)); // 1:√2 ratio ≈ 452px
exports.TOOLBOX_MARGIN_RIGHT = 460;
// Data storage paths
const getDataPath = () => {
    if (process.platform === 'win32') {
        return (0, path_1.join)(process.env.APPDATA || (0, os_1.homedir)(), 'Canvas', 'electron');
    }
    return (0, path_1.join)((0, os_1.homedir)(), '.canvas', 'electron');
};
exports.getDataPath = getDataPath;
const getAgentsPath = () => {
    return (0, path_1.join)((0, exports.getDataPath)(), 'agents');
};
exports.getAgentsPath = getAgentsPath;
const getAgentPath = (agentName) => {
    return (0, path_1.join)((0, exports.getAgentsPath)(), agentName);
};
exports.getAgentPath = getAgentPath;
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
};
//# sourceMappingURL=constants.js.map