import { app, BrowserWindow, screen } from 'electron';
import { join } from 'path';

type LauncherWindowOptions = {
  show?: boolean;
};

export class LauncherWindow {
  private window: BrowserWindow | null = null;

  constructor(private readonly options: LauncherWindowOptions = {}) {
    this.createWindow();
  }

  // ── Getters ──────────────────────────────────────────────

  get isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  // ── Public API ───────────────────────────────────────────

  toggle() {
    if (this.isVisible) this.hide();
    else this.show();
  }

  show() {
    const win = this.window;
    if (!win) return;

    win.show();
    win.focus();
    win.webContents.focus();

    const requestInputFocus = () => win.webContents.send('launcher:focus-input');
    if (win.webContents.isLoading()) win.webContents.once('did-finish-load', requestInputFocus);
    else requestInputFocus();
  }

  hide() {
    this.window?.hide();
  }

  focus() {
    this.window?.focus();
  }

  close() {
    this.window?.close();
  }

  // ── Window creation ──────────────────────────────────────

  private createWindow() {
    const width = 1280;
    const height = 860;
    const { x, y } = this.getPositionedBounds(width, height);

    const isDev = !app.isPackaged;

    const iconPath = isDev
      ? join(__dirname, '../../../../public/icons/logo_256x256.png')
      : join(process.resourcesPath, 'public/icons/logo_256x256.png');

    this.window = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      alwaysOnTop: false,
      transparent: true,
      skipTaskbar: true,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js'),
        v8CacheOptions: 'bypassHeatCheck',
        backgroundThrottling: false,
      },
    });

    this.window.setMenu(null);
    this.window.webContents.setFrameRate(60);

    if (isDev) {
      this.window.loadURL('http://localhost:3000/launcher.html');
    } else {
      this.window.loadFile(join(app.getAppPath(), 'dist/renderer/launcher.html'));
    }

    this.window.on('close', (event) => {
      if ((app as any).isQuitting) return;
      event.preventDefault();
      this.window?.hide();
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    this.window.once('ready-to-show', () => {
      if (this.options.show) {
        this.window?.show();
      }
    });
  }

  // ── Positioning ──────────────────────────────────────────
  // Sits 16px to the right of the menu panel (which is 480px wide at workArea.x + 16)

  private getPositionedBounds(width: number, height: number) {
    const { workArea } = screen.getPrimaryDisplay();
    const menuRight = workArea.x + 16 + 480;
    const x = menuRight + 16;
    const y = Math.floor(workArea.y + (workArea.height - height) / 2) - 24;
    return { x, y };
  }
}
