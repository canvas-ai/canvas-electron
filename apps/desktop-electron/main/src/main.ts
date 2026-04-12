import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { TrayManager } from './windows/tray';
import {
  clearAuthConfig,
  clearContextSelection,
  getSetupStatus,
  getAuthConfig,
  getShortcuts,
  getContextSelection,
  getMenuState,
  getGridOffset,
  markSetupComplete,
  setAuthConfig,
  setContextSelection,
  setMenuState,
  setGridOffset,
} from './config/app-config';
import {
  getActiveRemote,
  getDeviceConfig,
  getRemoteList,
  saveDeviceConfig,
  saveRemote,
  setActiveRemote,
} from './config/setup-store';
import { LauncherWindow } from './windows/LauncherWindow';
import { MenuWindow } from './windows/MenuWindow';
import { ToolboxWindow } from './windows/ToolboxWindow';
import { CanvasSocket } from './services/canvas-socket';
import { fireHook } from './services/hook-runner';

class CanvasApp {
  private tray: TrayManager | null = null;
  private launcher: LauncherWindow | null = null;
  private menu: MenuWindow | null = null;
  private toolbox: ToolboxWindow | null = null;
  private canvasSocket = new CanvasSocket();
  private readonly resetConfigRequested = process.argv.includes('--reset-config');
  private setupMode = false;
  private normalUiStarted = false;

  constructor() {
    this.canvasSocket.onEvent((event, payload) => fireHook(event, payload));
    this.setupApp();
    this.setupIPC();
  }

  // ── App lifecycle ────────────────────────────────────────

  private setupApp() {
    if (process.platform === 'linux') {
      app.commandLine.appendSwitch('enable-transparent-visuals');
    }

    app.enableSandbox();

    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      if (this.setupMode) {
        if (!this.launcher) this.launcher = new LauncherWindow({ show: true });
        this.launcher.show();
        this.launcher.focus();
        return;
      }

      this.menu?.showCollapsed();
    });

    app.whenReady().then(() => this.initialize());

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        // Keep running for tray.
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        if (this.setupMode) {
          if (!this.launcher) this.launcher = new LauncherWindow({ show: true });
          else this.launcher.show();
          return;
        }

        if (!this.menu) this.menu = new MenuWindow();
        this.menu.showCollapsed();
      }
    });

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
      this.canvasSocket.disconnect();
    });
  }

  private async initialize() {
    const setup = await getSetupStatus(this.resetConfigRequested);
    this.setupMode = setup.required;

    if (this.setupMode) {
      this.launcher = new LauncherWindow({ show: true });
      console.log('Canvas app initialized in setup mode');
      return;
    }

    await this.startNormalUi();
    console.log('Canvas app initialized');
  }

  private async startNormalUi() {
    if (this.normalUiStarted) return;

    const shortcuts = await getShortcuts();

    this.tray = new TrayManager({
      onMenuToggle: () => this.menu?.advanceStage(),
      onToolboxToggle: () => this.revealToolbox(),
      launcherShortcut: shortcuts.contextLauncher,
      menuShortcut: shortcuts.menuToggle,
      toolboxShortcut: shortcuts.toolboxToggle,
      onQuit: () => this.quit(),
    });

    if (!this.menu) this.menu = new MenuWindow();
    if (!this.toolbox) this.toolbox = new ToolboxWindow();
    this.menu.showCollapsed();

    this.registerGlobalShortcuts(shortcuts);
    await this.connectSocket();
    this.setupMode = false;
    this.normalUiStarted = true;
  }

  // ── Socket ──────────────────────────────────────────────

  private async connectSocket() {
    const auth = await getAuthConfig();
    if (auth?.serverUrl && auth?.token) {
      await this.canvasSocket.connect(auth.serverUrl, auth.token);
    }
  }

  // ── Shortcuts ────────────────────────────────────────────

  private registerGlobalShortcuts(shortcuts: { contextLauncher: string; menuToggle: string; toolboxToggle: string; devTools: string }) {
    globalShortcut.register(shortcuts.menuToggle, () => {
      this.menu?.advanceStage();
    });

    globalShortcut.register(shortcuts.toolboxToggle, () => {
      this.revealToolbox();
    });

    globalShortcut.register(shortcuts.devTools, () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools();
      }
    });
  }

  // ── IPC ──────────────────────────────────────────────────

  private broadcastToAll(channel: string) {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(channel);
    }
  }

  private setupIPC() {
    ipcMain.handle('auth:get-config', () => getAuthConfig());
    ipcMain.handle('auth:set-config', async (_, auth) => {
      await setAuthConfig(auth);
      this.broadcastToAll('auth:changed');
      await this.connectSocket();
    });
    ipcMain.handle('auth:clear-config', async () => {
      await clearAuthConfig();
      await clearContextSelection();
      this.canvasSocket.disconnect();
      this.broadcastToAll('auth:changed');
    });

    ipcMain.handle('context:get-selection', () => getContextSelection());
    ipcMain.handle('context:set-selection', (_, selection) => setContextSelection(selection));
    ipcMain.handle('context:clear-selection', () => clearContextSelection());

    ipcMain.handle('state:get-menu', () => getMenuState());
    ipcMain.handle('state:set-menu', (_, state) => setMenuState(state));
    ipcMain.handle('menu:get-shell-stage', () => this.menu?.shellStage ?? 'collapsed');
    ipcMain.handle('menu:set-shell-stage', (_, stage) => {
      if (!this.menu) return;
      this.menu.setStage(stage);
    });
    ipcMain.handle('menu:advance-shell-stage', () => {
      this.menu?.advanceStage();
    });

    ipcMain.handle('config:get-grid-offset', () => getGridOffset());
    ipcMain.handle('config:set-grid-offset', (_, offset) => setGridOffset(offset));

    ipcMain.handle('toolbox:get-mode', () => this.toolbox?.mode ?? 'dot');
    ipcMain.handle('toolbox:set-mode', (_, mode) => this.toolbox?.setMode(mode));

    ipcMain.handle('setup:get-state', async () => {
      const state = await getSetupStatus(this.resetConfigRequested);
      return {
        ...state,
        required: this.setupMode,
      };
    });
    ipcMain.handle('setup:get-remotes', () => getRemoteList());
    ipcMain.handle('setup:get-device', () => getDeviceConfig());
    ipcMain.handle('setup:save-remote', (_, payload) => saveRemote(payload));
    ipcMain.handle('setup:save-device', (_, payload) => saveDeviceConfig(payload));
    ipcMain.handle('setup:complete', async (_, remoteId?: string) => {
      const activeRemote = remoteId ? setActiveRemote(remoteId) : getActiveRemote();
      if (!activeRemote) {
        throw new Error('No configured remote available.');
      }

      await setAuthConfig({
        serverUrl: activeRemote.serverUrl,
        token: activeRemote.auth.token,
        email: activeRemote.email,
      });
      await markSetupComplete();
      await this.startNormalUi();
      this.broadcastToAll('auth:changed');
      this.broadcastToAll('setup:changed');
      this.launcher?.show();
      return { ok: true };
    });

    ipcMain.handle('ws:subscribe', (event, channel) => {
      this.canvasSocket.subscribe(event.sender.id, channel);
    });
    ipcMain.handle('ws:unsubscribe', (event, channel) => {
      this.canvasSocket.unsubscribe(event.sender.id, channel);
    });
    ipcMain.handle('app:quit', () => this.quit());
  }

  private revealToolbox() {
    if (!this.toolbox) return;
    if (this.toolbox.isVisible) {
      this.toolbox.hide();
      return;
    }

    if (this.toolbox.mode === 'dot') {
      this.toolbox.setMode('toolbox');
    }
    this.toolbox.show();
  }

  // ── Quit ─────────────────────────────────────────────────

  private quit() {
    (app as any).isQuitting = true;
    this.canvasSocket.disconnect();
    this.tray?.destroy();
    this.tray = null;

    for (const win of BrowserWindow.getAllWindows()) {
      try {
        win.close();
      } catch {
        // ignore
      }
    }

    app.exit(0);
  }
}

new CanvasApp();
