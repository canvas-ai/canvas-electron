import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { TrayManager } from './windows/tray';
import {
  clearAuthConfig,
  clearContextSelection,
  getAuthConfig,
  getShortcuts,
  getContextSelection,
  getMenuState,
  getGridOffset,
  setAuthConfig,
  setContextSelection,
  setMenuState,
  setGridOffset,
} from './config/app-config';
import { LauncherWindow } from './windows/LauncherWindow';
import { MenuWindow } from './windows/MenuWindow';
import { CanvasSocket } from './services/canvas-socket';
import { fireHook } from './services/hook-runner';

class CanvasApp {
  private tray: TrayManager | null = null;
  private launcher: LauncherWindow | null = null;
  private menu: MenuWindow | null = null;
  private canvasSocket = new CanvasSocket();

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
      if (!this.launcher) this.launcher = new LauncherWindow({ show: true });
      this.launcher.show();
      this.launcher.focus();
    });

    app.whenReady().then(() => this.initialize());

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        // Keep running for tray.
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        if (!this.launcher) this.launcher = new LauncherWindow({ show: true });
        else this.launcher.show();
      }
    });

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
      this.canvasSocket.disconnect();
    });
  }

  private async initialize() {
    const shortcuts = await getShortcuts();

    this.tray = new TrayManager({
      onLauncherToggle: () => this.launcher?.toggle(),
      onMenuToggle: () => this.menu?.toggle(),
      launcherShortcut: shortcuts.contextLauncher,
      menuShortcut: shortcuts.menuToggle,
      onQuit: () => this.quit(),
    });

    this.launcher = new LauncherWindow({ show: false });
    this.menu = new MenuWindow();
    this.registerGlobalShortcuts(shortcuts);

    await this.connectSocket();
    console.log('Canvas app initialized');
  }

  // ── Socket ──────────────────────────────────────────────

  private async connectSocket() {
    const auth = await getAuthConfig();
    if (auth?.serverUrl && auth?.token) {
      await this.canvasSocket.connect(auth.serverUrl, auth.token);
    }
  }

  // ── Shortcuts ────────────────────────────────────────────

  private registerGlobalShortcuts(shortcuts: { contextLauncher: string; menuToggle: string; devTools: string }) {
    globalShortcut.register(shortcuts.contextLauncher, () => {
      this.launcher?.toggle();
    });

    globalShortcut.register(shortcuts.menuToggle, () => {
      this.menu?.toggle();
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

    ipcMain.handle('config:get-grid-offset', () => getGridOffset());
    ipcMain.handle('config:set-grid-offset', (_, offset) => setGridOffset(offset));

    ipcMain.handle('ws:subscribe', (event, channel) => {
      this.canvasSocket.subscribe(event.sender.id, channel);
    });
    ipcMain.handle('ws:unsubscribe', (event, channel) => {
      this.canvasSocket.unsubscribe(event.sender.id, channel);
    });
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

    app.quit();
    setTimeout(() => app.exit(0), 250);
  }
}

new CanvasApp();
