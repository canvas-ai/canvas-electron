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
const ui_settings_1 = require("./persistence/ui-settings");
class CanvasApp {
    tray = null;
    toolbox = null;
    windowManager;
    launcherCanvasId = null;
    authSession = null;
    conversationManager;
    chatService;
    mcpService;
    constructor() {
        this.windowManager = new WindowManager_1.WindowManager(() => this.tray?.refresh());
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
        this.authSession = await (0, ui_settings_1.getUiAuthSession)();
        // Create tray
        this.tray = new tray_1.TrayManager({
            onToolboxToggle: () => this.toggleToolbox(),
            getCanvases: () => this.windowManager.listCanvases(),
            onCanvasFocus: (id) => this.windowManager.focusCanvas(id),
            isToolboxEnabled: () => this.isAuthenticated(),
            onOpenCanvasDevTools: () => this.windowManager.openActiveCanvasDevTools(),
            onReloadCanvas: () => this.windowManager.reloadActiveCanvas(),
            onOpenToolboxDevTools: () => {
                if (!this.toolbox)
                    this.toolbox = new toolbox_1.ToolboxWindow({ mode: 'minimized' });
                this.toolbox.openDevTools();
            },
            onReloadToolbox: () => {
                if (!this.toolbox)
                    this.toolbox = new toolbox_1.ToolboxWindow({ mode: 'minimized' });
                this.toolbox.reload();
            },
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
        // Super+C to toggle visibility of active canvas
        electron_1.globalShortcut.register('Super+C', () => {
            this.windowManager.toggleActiveCanvasVisibility();
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
            if (!this.isAuthenticated())
                return;
            this.toolbox?.show();
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.CLOSE_TOOLBOX, () => {
            this.toolbox?.hide();
        });
        // Window controls (frameless window)
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_MINIMIZE, () => {
            electron_1.BrowserWindow.getFocusedWindow()?.minimize();
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, () => {
            const win = electron_1.BrowserWindow.getFocusedWindow();
            if (!win)
                return;
            if (win.isMaximized())
                win.unmaximize();
            else
                win.maximize();
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_CLOSE, () => {
            // Close button should hide the window (keep app alive / keep window instance)
            const win = electron_1.BrowserWindow.getFocusedWindow();
            if (!win)
                return;
            if (electron_1.app.isQuitting)
                win.close();
            else
                win.hide();
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.APP_QUIT, () => {
            this.quit();
        });
        // Auth session
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.GET_AUTH_SESSION, async () => {
            this.authSession = await (0, ui_settings_1.getUiAuthSession)();
            return this.authSession;
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SET_AUTH_SESSION, async (_, session) => {
            await (0, ui_settings_1.setUiAuthSession)(session);
            this.authSession = session;
            this.tray?.refresh();
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.CLEAR_AUTH_SESSION, async () => {
            await (0, ui_settings_1.setUiAuthSession)(null);
            this.authSession = null;
            this.toolbox?.hide();
            this.tray?.refresh();
        });
    }
    toggleToolbox() {
        if (!this.isAuthenticated())
            return;
        if (!this.toolbox)
            this.toolbox = new toolbox_1.ToolboxWindow({ mode: 'minimized' });
        if (this.toolbox.isVisible())
            return this.toolbox.hide();
        this.toolbox.showMinimizedDocked(this.windowManager.getToolboxDockRect());
    }
    isAuthenticated() {
        return !!this.authSession?.token;
    }
    quit() {
        electron_1.app.isQuitting = true;
        // Tear down tray first so it doesn't look like the app is still running.
        this.tray?.destroy();
        this.tray = null;
        // Close windows (CanvasWindow prevents close unless isQuitting is set)
        for (const win of electron_1.BrowserWindow.getAllWindows()) {
            try {
                win.close();
            }
            catch {
                // ignore
            }
        }
        this.toolbox?.close();
        this.toolbox = null;
        electron_1.app.quit();
        // In dev, app.quit() can sometimes leave the process around due to weird event loops.
        setTimeout(() => electron_1.app.exit(0), 250);
    }
}
// Create the app instance
new CanvasApp();
//# sourceMappingURL=main.js.map