import { app, BrowserWindow, screen } from 'electron';
import { join } from 'path';

type ContextLauncherWindowOptions = {
  show?: boolean;
};

export class ContextLauncherWindow {
  private window: BrowserWindow | null = null;

  constructor(private readonly options: ContextLauncherWindowOptions = {}) {
    this.createWindow();
  }

  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  public show() {
    this.window?.show();
    this.window?.focus();
  }

  public hide() {
    this.window?.hide();
  }

  public focus() {
    this.window?.focus();
  }

  public close() {
    this.window?.close();
  }

  private createWindow() {
    const width = 1280;
    const height = 800;
    const { x, y } = this.getCenteredBounds(width, height);

    this.window = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      alwaysOnTop: true,
      transparent: true,
      backgroundColor: '#00000000',
      vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
      visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
      backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../../preload.js'),
      },
    });

    this.window.setMenu(null);

    if (process.env.NODE_ENV === 'development') {
      this.window.loadURL('http://localhost:3000/context-launcher.html');
    } else {
      this.window.loadFile(join(__dirname, '../../../../../renderer/context-launcher.html'));
    }

    this.window.on('close', (event) => {
      if ((app as any).isQuitting) return;
      event.preventDefault();
      this.window?.hide();
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    if (this.options.show) {
      this.window.show();
    }
  }

  private getCenteredBounds(width: number, height: number) {
    const { workArea } = screen.getPrimaryDisplay();
    const x = Math.floor(workArea.x + (workArea.width - width) / 2);
    const y = Math.floor(workArea.y + (workArea.height - height) / 2);
    return { x, y };
  }
}
