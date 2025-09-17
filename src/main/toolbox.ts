import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { TOOLBOX_WIDTH, TOOLBOX_HEIGHT, TOOLBOX_MARGIN_RIGHT } from '../shared/constants';

export class ToolboxWindow {
  private window: BrowserWindow | null = null;

  constructor() {
    this.createWindow();
  }

  private createWindow() {
    const { x, y } = this.calculatePosition();

    this.window = new BrowserWindow({
      width: TOOLBOX_WIDTH,
      height: TOOLBOX_HEIGHT,
      x,
      y,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
      },
    });

    // Load the toolbox renderer
    if (process.env.NODE_ENV === 'development') {
      this.window.loadURL('http://localhost:3000/toolbox.html');
      // this.window.webContents.openDevTools({ mode: 'detach' });
    } else {
      this.window.loadFile(join(__dirname, '../renderer/toolbox.html'));
    }

    // Window event handlers
    this.window.on('closed', () => {
      this.window = null;
    });

    this.window.on('blur', () => {
      // Hide window when it loses focus (like a popup)
      if (this.window && !this.window.webContents.isDevToolsOpened()) {
        this.hide();
      }
    });

    // Prevent the window from being moved
    this.window.on('move', () => {
      if (this.window) {
        const { x, y } = this.calculatePosition();
        this.window.setPosition(x, y);
      }
    });
  }

  private calculatePosition(): { x: number; y: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Position 460px from the right edge, centered vertically
    const x = screenWidth - TOOLBOX_WIDTH - TOOLBOX_MARGIN_RIGHT;
    const y = Math.floor((screenHeight - TOOLBOX_HEIGHT) / 2);

    return { x, y };
  }

  public show() {
    if (!this.window) {
      this.createWindow();
    }

    if (this.window) {
      // Ensure correct position before showing
      const { x, y } = this.calculatePosition();
      this.window.setPosition(x, y);
      
      this.window.show();
      this.window.focus();
    }
  }

  public hide() {
    if (this.window) {
      this.window.hide();
    }
  }

  public focus() {
    if (this.window) {
      this.window.focus();
    }
  }

  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  public close() {
    if (this.window) {
      this.window.close();
    }
  }

  public reload() {
    if (this.window) {
      this.window.reload();
    }
  }

  public openDevTools() {
    if (this.window) {
      this.window.webContents.openDevTools({ mode: 'detach' });
    }
  }
}