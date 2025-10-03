import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { TOOLBOX_WIDTH, getToolboxHeight, TOOLBOX_MARGIN_RIGHT } from '../shared/constants';

export class ToolboxWindow {
  private window: BrowserWindow | null = null;

  constructor() {
    this.createWindow();
  }

  private createWindow() {
    const { x, y } = this.calculatePosition();
    const height = getToolboxHeight();

    this.window = new BrowserWindow({
      width: TOOLBOX_WIDTH,
      height,
      x,
      y,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: true,
      show: false,
      minWidth: 400,
      minHeight: 300,
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
      this.window.loadFile(join(__dirname, '../../renderer/toolbox.html'));
    }

    // Window event handlers
    this.window.on('closed', () => {
      this.window = null;
    });

    // Keep window visible when it loses focus for better usability
    // this.window.on('blur', () => {
    //   if (this.window && !this.window.webContents.isDevToolsOpened()) {
    //     this.hide();
    //   }
    // });

    // Allow window to be moved for better usability
    // this.window.on('move', () => {
    //   if (this.window) {
    //     const { x, y } = this.calculatePosition();
    //     this.window.setPosition(x, y);
    //   }
    // });
  }

  private calculatePosition(): { x: number; y: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const toolboxHeight = getToolboxHeight();

    // Position 460px from the right edge, centered vertically
    const x = screenWidth - TOOLBOX_WIDTH - TOOLBOX_MARGIN_RIGHT;
    const y = Math.floor((screenHeight - toolboxHeight) / 2);

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
