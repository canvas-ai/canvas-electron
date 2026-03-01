import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { TrayManager } from './windows/tray';
import {
  clearAuthConfig,
  clearContextSelection,
  getAuthConfig,
  getContextLauncherShortcut,
  getContextSelection,
  setAuthConfig,
  setContextSelection,
} from './config/app-config';
import { LauncherWindow } from './windows/LauncherWindow';
import { MenuWindow } from './windows/MenuWindow';

class CanvasApp {
  private tray: TrayManager | null = null;
  private launcher: LauncherWindow | null = null;
  private menu: MenuWindow | null = null;

  constructor() {
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
    });
  }

  private async initialize() {
    const launcherShortcut = await getContextLauncherShortcut();

    this.tray = new TrayManager({
      onLauncherToggle: () => this.launcher?.toggle(),
      launcherShortcut,
      onQuit: () => this.quit(),
    });

    this.launcher = new LauncherWindow({ show: false });
    this.menu = new MenuWindow();
    this.registerGlobalShortcuts(launcherShortcut);
    console.log('Canvas app initialized');
  }

  // ── Shortcuts ────────────────────────────────────────────

  private registerGlobalShortcuts(launcherShortcut: string) {
    globalShortcut.register(launcherShortcut, () => {
      this.launcher?.toggle();
    });

    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      this.menu?.toggle();
    });

    globalShortcut.register('CommandOrControl+Shift+F12', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools();
      }
    });
  }

  // ── IPC ──────────────────────────────────────────────────

  private setupIPC() {
    ipcMain.handle('auth:get-config', async () => {
      return await getAuthConfig();
    });

    ipcMain.handle('auth:set-config', async (_, auth) => {
      await setAuthConfig(auth);
    });

    ipcMain.handle('auth:clear-config', async () => {
      await clearAuthConfig();
      await clearContextSelection();
    });

    ipcMain.handle('context:get-selection', async () => {
      return await getContextSelection();
    });

    ipcMain.handle('context:set-selection', async (_, selection) => {
      await setContextSelection(selection);
    });

    ipcMain.handle('context:clear-selection', async () => {
      await clearContextSelection();
    });
  }

  // ── Quit ─────────────────────────────────────────────────

  private quit() {
    (app as any).isQuitting = true;
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
