"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const tray_1 = require("./tray");
const toolbox_1 = require("./toolbox");
const conversation_manager_1 = require("./conversation-manager");
const chat_service_1 = require("./chat-service");
const mcp_service_1 = require("./mcp-service");
const constants_1 = require("../shared/constants");
const WindowManager_1 = require("./window-manager/WindowManager");
class CanvasApp {
    tray = null;
    toolbox = null;
    windowManager = new WindowManager_1.WindowManager();
    launcherCanvasId = null;
    conversationManager;
    chatService;
    mcpService;
    constructor() {
        this.conversationManager = new conversation_manager_1.ConversationManager();
        this.chatService = new chat_service_1.ChatService();
        this.mcpService = new mcp_service_1.MCPService();
        this.setupApp();
        this.setupIPC();
    }
    setupApp() {
        // Enable sandbox for security
        electron_1.app.enableSandbox();
        // Single instance lock
        const gotTheLock = electron_1.app.requestSingleInstanceLock();
        if (!gotTheLock) {
            electron_1.app.quit();
            return;
        }
        electron_1.app.on('second-instance', () => {
            // Someone tried to run a second instance, focus our launcher instead
            if (this.toolbox) {
                this.toolbox.show();
                this.toolbox.focus();
                return;
            }
            if (this.launcherCanvasId)
                this.windowManager.focusCanvas(this.launcherCanvasId);
        });
        electron_1.app.whenReady().then(() => {
            this.initialize();
        });
        electron_1.app.on('window-all-closed', () => {
            // Don't quit the app when all windows are closed on macOS
            // Keep it running for the tray
            if (process.platform !== 'darwin') {
                // On other platforms, we still keep it running for the tray
            }
        });
        electron_1.app.on('activate', () => {
            // On macOS, re-create windows when dock icon is clicked
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                if (this.launcherCanvasId)
                    this.windowManager.focusCanvas(this.launcherCanvasId);
            }
        });
        electron_1.app.on('will-quit', () => {
            electron_1.globalShortcut.unregisterAll();
        });
    }
    async initialize() {
        // Create tray
        this.tray = new tray_1.TrayManager({
            onToolboxToggle: () => this.toggleToolbox(),
            onQuit: () => this.quit(),
        });
        // Create launcher canvas window (centered)
        this.launcherCanvasId = this.windowManager.createLauncherCanvas({ show: true });
        // Register global shortcuts
        this.registerGlobalShortcuts();
        console.log('Canvas app initialized');
    }
    registerGlobalShortcuts() {
        // Super+Space to toggle toolbox
        electron_1.globalShortcut.register('Super+Space', () => {
            this.toggleToolbox();
        });
        // Alternative shortcut for systems where Super might not work
        electron_1.globalShortcut.register('CommandOrControl+Alt+Space', () => {
            this.toggleToolbox();
        });
    }
    setupIPC() {
        // Conversations
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.GET_CONVERSATIONS, async (_, agentName) => {
            return await this.conversationManager.getConversations(agentName);
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SAVE_CONVERSATION, async (_, conversation) => {
            return await this.conversationManager.saveConversation(conversation);
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DELETE_CONVERSATION, async (_, conversationId, agentName) => {
            return await this.conversationManager.deleteConversation(conversationId, agentName);
        });
        // Chat
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SEND_MESSAGE, async (_, message, agentConfig) => {
            return await this.chatService.sendMessage(message, agentConfig);
        });
        // Window management
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPEN_TOOLBOX, () => {
            this.toolbox?.show();
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.CLOSE_TOOLBOX, () => {
            this.toolbox?.hide();
        });
    }
    toggleToolbox() {
        const anchor = this.launcherCanvasId ? this.windowManager.getCanvasBounds(this.launcherCanvasId) : null;
        if (!anchor)
            return;
        if (!this.toolbox)
            this.toolbox = new toolbox_1.ToolboxWindow({ mode: 'minimized' });
        if (this.toolbox.isVisible())
            return this.toolbox.hide();
        this.toolbox.showMinimizedNextTo(anchor, 32);
    }
    quit() {
        electron_1.app.isQuitting = true;
        electron_1.app.quit();
    }
}
// Create the app instance
new CanvasApp();
//# sourceMappingURL=main.js.map