import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { TrayManager } from './tray';
import { ToolboxWindow } from './toolbox';
import { ConversationManager } from './conversation-manager';
import { ChatService } from './chat-service';
import { MCPService } from './mcp-service';
import { IPC_CHANNELS } from '../shared/constants';
import { WindowManager } from './window-manager/WindowManager';
import type { AuthSession } from '../shared/types';
import { getUiAuthSession, setUiAuthSession } from './persistence/ui-settings';

class CanvasApp {
  private tray: TrayManager | null = null;
  private toolbox: ToolboxWindow | null = null;
  private windowManager: WindowManager;
  private launcherCanvasId: string | null = null;
  private authSession: AuthSession | null = null;
  private conversationManager: ConversationManager;
  private chatService: ChatService;
  private mcpService: MCPService;

  constructor() {
    this.windowManager = new WindowManager(() => this.tray?.refresh());
    this.conversationManager = new ConversationManager();
    this.chatService = new ChatService();
    this.mcpService = new MCPService();

    this.setupApp();
    this.setupIPC();
  }

  private setupApp() {
    // Enable sandbox for security
    app.enableSandbox();

    // Single instance lock
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      // Someone tried to run a second instance, focus our launcher instead
      if (this.toolbox) {
        this.toolbox.show();
        this.toolbox.focus();
        return;
      }
      if (this.launcherCanvasId) this.windowManager.focusCanvas(this.launcherCanvasId);
    });

    app.whenReady().then(() => {
      this.initialize();
    });

    app.on('window-all-closed', () => {
      // Don't quit the app when all windows are closed on macOS
      // Keep it running for the tray
      if (process.platform !== 'darwin') {
        // On other platforms, we still keep it running for the tray
      }
    });

    app.on('activate', () => {
      // On macOS, re-create windows when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        if (this.launcherCanvasId) this.windowManager.focusCanvas(this.launcherCanvasId);
      }
    });

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  private async initialize() {
    this.authSession = await getUiAuthSession();

    // Create tray
    this.tray = new TrayManager({
      onToolboxToggle: () => this.toggleToolbox(),
      getCanvases: () => this.windowManager.listCanvases(),
      onCanvasFocus: (id) => this.windowManager.focusCanvas(id),
      isToolboxEnabled: () => this.isAuthenticated(),
      onQuit: () => this.quit(),
    });

    // Create launcher canvas window (centered)
    this.launcherCanvasId = this.windowManager.createLauncherCanvas({ show: true });

    // Register global shortcuts
    this.registerGlobalShortcuts();

    console.log('Canvas app initialized');
  }

  private registerGlobalShortcuts() {
    // Super+Space to toggle toolbox
    globalShortcut.register('Super+Space', () => {
      this.toggleToolbox();
    });

    // Super+C to toggle visibility of active canvas
    globalShortcut.register('Super+C', () => {
      this.windowManager.toggleActiveCanvasVisibility();
    });

    // Alternative shortcut for systems where Super might not work
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      this.toggleToolbox();
    });
  }

  private setupIPC() {
    // Conversations
    ipcMain.handle(IPC_CHANNELS.GET_CONVERSATIONS, async (_, agentName) => {
      return await this.conversationManager.getConversations(agentName);
    });

    ipcMain.handle(IPC_CHANNELS.SAVE_CONVERSATION, async (_, conversation) => {
      return await this.conversationManager.saveConversation(conversation);
    });

    ipcMain.handle(IPC_CHANNELS.DELETE_CONVERSATION, async (_, conversationId, agentName) => {
      return await this.conversationManager.deleteConversation(conversationId, agentName);
    });

    // Chat
    ipcMain.handle(IPC_CHANNELS.SEND_MESSAGE, async (_, message, agentConfig) => {
      return await this.chatService.sendMessage(message, agentConfig);
    });

    // Window management
    ipcMain.handle(IPC_CHANNELS.OPEN_TOOLBOX, () => {
      if (!this.isAuthenticated()) return;
      this.toolbox?.show();
    });

    ipcMain.handle(IPC_CHANNELS.CLOSE_TOOLBOX, () => {
      this.toolbox?.hide();
    });

    // Auth session
    ipcMain.handle(IPC_CHANNELS.GET_AUTH_SESSION, async () => {
      this.authSession = await getUiAuthSession();
      return this.authSession;
    });

    ipcMain.handle(IPC_CHANNELS.SET_AUTH_SESSION, async (_, session: AuthSession) => {
      await setUiAuthSession(session);
      this.authSession = session;
      this.tray?.refresh();
    });

    ipcMain.handle(IPC_CHANNELS.CLEAR_AUTH_SESSION, async () => {
      await setUiAuthSession(null);
      this.authSession = null;
      this.toolbox?.hide();
      this.tray?.refresh();
    });
  }

  private toggleToolbox() {
    if (!this.isAuthenticated()) return;
    if (!this.toolbox) this.toolbox = new ToolboxWindow({ mode: 'minimized' });

    if (this.toolbox.isVisible()) return this.toolbox.hide();
    this.toolbox.showMinimizedDocked(this.windowManager.getToolboxDockRect());
  }

  private isAuthenticated(): boolean {
    return !!this.authSession?.token;
  }

  private quit() {
    (app as any).isQuitting = true;
    app.quit();
  }
}

// Create the app instance
new CanvasApp();
