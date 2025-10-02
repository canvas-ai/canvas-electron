import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { join } from 'path';
import { TrayManager } from './tray';
import { ToolboxWindow } from './toolbox';
import { SettingsWindow } from './settings';
import { SettingsManager } from './settings-manager';
import { ConversationManager } from './conversation-manager';
import { ChatService } from './chat-service';
import { MCPService } from './mcp-service';
import { IPC_CHANNELS } from '../shared/constants';

class CanvasApp {
  private tray: TrayManager | null = null;
  private toolbox: ToolboxWindow | null = null;
  private settingsWindow: SettingsWindow | null = null;
  private settingsManager: SettingsManager;
  private conversationManager: ConversationManager;
  private chatService: ChatService;
  private mcpService: MCPService;

  constructor() {
    this.settingsManager = new SettingsManager();
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
    // Initialize settings
    await this.settingsManager.initialize();

    // Create tray
    this.tray = new TrayManager({
      onToolboxToggle: () => this.toggleToolbox(),
      onSettingsOpen: () => this.openSettings(),
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
    // Settings
    ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
      return await this.settingsManager.getSettings();
    });

    ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_, settings) => {
      return await this.settingsManager.saveSettings(settings);
    });

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

    ipcMain.handle(IPC_CHANNELS.OPEN_SETTINGS, () => {
      this.openSettings();
    });

    ipcMain.handle(IPC_CHANNELS.CLOSE_SETTINGS, () => {
      this.settingsWindow?.close();
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

  private openSettings() {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new SettingsWindow();
    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  private quit() {
    (app as any).isQuitting = true;
    app.quit();
  }
}

// Create the app instance
new CanvasApp();
