import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { join } from 'path';
import { TrayManager } from './tray';
import { ToolboxWindow } from './toolbox';
import { ConversationManager } from './conversation-manager';
import { ChatService } from './chat-service';
import { MCPService } from './mcp-service';
import { IPC_CHANNELS } from '../shared/constants';

class CanvasApp {
  private tray: TrayManager | null = null;
  private toolbox: ToolboxWindow | null = null;
  private conversationManager: ConversationManager;
  private chatService: ChatService;
  private mcpService: MCPService;

  constructor() {
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
      // Someone tried to run a second instance, focus our toolbox instead
      if (this.toolbox) {
        this.toolbox.show();
        this.toolbox.focus();
      }
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
        this.toolbox?.show();
      }
    });

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  private async initialize() {
    // Create tray
    this.tray = new TrayManager({
      onToolboxToggle: () => this.toggleToolbox(),
      onQuit: () => this.quit(),
    });

    // Create toolbox window
    this.toolbox = new ToolboxWindow();

    // Register global shortcuts
    this.registerGlobalShortcuts();

    console.log('Canvas app initialized');
  }

  private registerGlobalShortcuts() {
    // Super+Space to toggle toolbox
    globalShortcut.register('Super+Space', () => {
      this.toggleToolbox();
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
      this.toolbox?.show();
    });

    ipcMain.handle(IPC_CHANNELS.CLOSE_TOOLBOX, () => {
      this.toolbox?.hide();
    });

  }

  private toggleToolbox() {
    if (!this.toolbox) return;

    if (this.toolbox.isVisible()) {
      this.toolbox.hide();
    } else {
      this.toolbox.show();
      this.toolbox.focus();
    }
  }


  private quit() {
    (app as any).isQuitting = true;
    app.quit();
  }
}

// Create the app instance
new CanvasApp();
