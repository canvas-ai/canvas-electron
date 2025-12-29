import { BrowserWindow, screen } from 'electron';
import { join } from 'path';

export type CanvasWindowId = string;

export type WindowBounds = { x: number; y: number; width: number; height: number };

type CanvasWindowOptions = {
  id: CanvasWindowId;
  show?: boolean;
  bounds?: { width: number; height: number };
};

export class CanvasWindow {
  private window: BrowserWindow | null = null;

  constructor(private readonly options: CanvasWindowOptions) {
    this.createWindow();
  }

  public get id(): CanvasWindowId {
    return this.options.id;
  }

  public getBounds(): WindowBounds | null {
    if (!this.window) return null;
    const { x, y, width, height } = this.window.getBounds();
    return { x, y, width, height };
  }

  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
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
    const { width, height, x, y } = this.getLauncherBounds(
      this.options.bounds?.width ?? 960,
      this.options.bounds?.height ?? 680
    );

    this.window = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      backgroundColor: '#0b0b0c',
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

    this.window.on('closed', () => {
      this.window = null;
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

