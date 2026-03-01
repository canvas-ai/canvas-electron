import { app, BrowserWindow, screen } from 'electron';
import { join } from 'path';

export class MenuWindow {
  private window: BrowserWindow | null = null;

  constructor() {
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
    if (!this.window) return;
    this.updateBounds();
    this.window.show();
  }

  hide() {
    this.window?.hide();
  }

  close() {
    this.window?.close();
  }

  // ── Window creation ──────────────────────────────────────

  private createWindow() {
    const isDev = !app.isPackaged;
    const bounds = this.calcBounds();

    const iconPath = isDev
      ? join(__dirname, '../../../../public/icons/logo_256x256.png')
      : join(process.resourcesPath, 'public/icons/logo_256x256.png');

    this.window = new BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      autoHideMenuBar: true,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js'),
        backgroundThrottling: false,
      },
    });

    this.window.setMenu(null);
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (isDev) {
      this.window.loadURL('http://localhost:3000/menu.html');
    } else {
      this.window.loadFile(join(app.getAppPath(), 'dist/renderer/menu.html'));
    }

    this.window.on('close', (event) => {
      if ((app as any).isQuitting) return;
      event.preventDefault();
      this.window?.hide();
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  // ── Positioning ──────────────────────────────────────────

  private calcBounds() {
    const { workArea } = screen.getPrimaryDisplay();
    const padding = 16;
    return {
      width: 480,
      height: workArea.height - padding * 2,
      x: workArea.x + padding,
      y: workArea.y + padding,
    };
  }

  private updateBounds() {
    if (!this.window) return;
    const bounds = this.calcBounds();
    this.window.setBounds(bounds);
  }
}
