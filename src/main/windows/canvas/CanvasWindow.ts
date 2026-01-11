import { app, BrowserWindow, screen } from 'electron';
import { join } from 'path';

export type CanvasWindowId = string;

export type WindowBounds = { x: number; y: number; width: number; height: number };

type CanvasWindowOptions = {
  id: CanvasWindowId;
  show?: boolean;
  bounds?: { x?: number; y?: number; width: number; height: number };
  onFocus?: (id: CanvasWindowId) => void;
  onNewCanvasRight?: (id: CanvasWindowId) => void;
};

export class CanvasWindow {
  private window: BrowserWindow | null = null;

  constructor(private readonly options: CanvasWindowOptions) {
    this.createWindow();
  }

  public get id(): CanvasWindowId {
    return this.options.id;
  }

  public openDevTools() {
    this.window?.webContents.openDevTools({ mode: 'detach' });
  }

  public reload() {
    this.window?.webContents.reload();
  }

  public getBounds(): WindowBounds | null {
    if (!this.window) return null;
    const { x, y, width, height } = this.window.getBounds();
    return { x, y, width, height };
  }

  public setBounds(bounds: WindowBounds) {
    this.window?.setBounds(bounds);
  }

  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  public hide() {
    this.window?.hide();
  }

  public show() {
    this.window?.show();
    this.window?.focus();
  }

  public focus() {
    this.window?.focus();
  }

  public close() {
    this.window?.close();
  }

  private createWindow() {
    const width = this.options.bounds?.width ?? 960;
    const height = this.options.bounds?.height ?? 680;
    const fallback = this.getLauncherBounds(width, height);
    const x = this.options.bounds?.x ?? fallback.x;
    const y = this.options.bounds?.y ?? fallback.y;

    this.window = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../../preload.js'),
      },
    });

    // No native menu - we render our own.
    this.window.setMenu(null);

    // Load the main (canvas) renderer
    if (process.env.NODE_ENV === 'development') {
      this.window.loadURL('http://localhost:3000/index.html');
    } else {
      this.window.loadFile(join(__dirname, '../../../../renderer/index.html'));
    }

    // Keep window instance alive: close => hide (unless app is quitting)
    this.window.on('close', (event) => {
      if ((app as any).isQuitting) return;
      event.preventDefault();
      this.window?.hide();
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    this.window.on('focus', () => {
      this.options.onFocus?.(this.options.id);
    });

    this.window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;

      // DevTools shortcuts
      const key = input.key?.toLowerCase?.() ?? '';
      const isDevTools =
        key === 'f12' || ((input.control || input.meta) && input.shift && key === 'i');
      if (isDevTools) {
        event.preventDefault();
        this.openDevTools();
        return;
      }

      const isNew = (input.control || input.meta) && input.key.toLowerCase() === 'n';
      if (!isNew) return;
      event.preventDefault();
      this.options.onNewCanvasRight?.(this.options.id);
    });

    if (this.options.show ?? true) {
      this.window.show();
    }
  }

  private getLauncherBounds(width: number, height: number): WindowBounds {
    const { workArea } = screen.getPrimaryDisplay();
    const x = Math.floor(workArea.x + (workArea.width - width) / 2);
    const y = Math.floor(workArea.y + (workArea.height - height) / 2);
    return { x, y, width, height };
  }
}

