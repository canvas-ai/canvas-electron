import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { TrayManager } from './tray';
import {
  clearAuthConfig,
  clearContextSelection,
  getAuthConfig,
  getContextLauncherShortcut,
  getContextSelection,
  setAuthConfig,
  setContextSelection,
} from './config/app-config';
import { ContextLauncherWindow } from './windows/context-launcher/ContextLauncherWindow';

class CanvasApp {
  private tray: TrayManager | null = null;
  private contextLauncher: ContextLauncherWindow | null = null;

  constructor() {
    this.setupApp();
    this.setupIPC();
  }

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
      if (!this.contextLauncher) this.contextLauncher = new ContextLauncherWindow({ show: true });
      this.contextLauncher.show();
      this.contextLauncher.focus();
    });

    app.whenReady().then(() => this.initialize());

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        // Keep running for tray.
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        if (!this.contextLauncher) this.contextLauncher = new ContextLauncherWindow({ show: true });
        else this.contextLauncher.show();
      }
    });

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  private async initialize() {
    const launcherShortcut = await getContextLauncherShortcut();

    this.tray = new TrayManager({
      onLauncherToggle: () => this.toggleContextLauncher(),
      launcherShortcut,
      onQuit: () => this.quit(),
    });

    this.contextLauncher = new ContextLauncherWindow({ show: false });
    this.registerGlobalShortcuts(launcherShortcut);
    console.log('Canvas app initialized');
  }

  private registerGlobalShortcuts(launcherShortcut: string) {
    globalShortcut.register(launcherShortcut, () => {
      this.toggleContextLauncher();
    });

    globalShortcut.register('CommandOrControl+Shift+F12', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools();
      }
    });
  }

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

  private toggleContextLauncher() {
    if (!this.contextLauncher) this.contextLauncher = new ContextLauncherWindow({ show: false });
    if (this.contextLauncher.isVisible()) return this.contextLauncher.hide();
    this.contextLauncher.show();
  }

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
