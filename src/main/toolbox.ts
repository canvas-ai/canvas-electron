import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { TOOLBOX_WIDTH, getToolboxHeight, TOOLBOX_MARGIN_RIGHT } from '../shared/constants';

export type WindowBounds = { x: number; y: number; width: number; height: number };
export type ToolboxMode = 'normal' | 'minimized';

export class ToolboxWindow {
  private window: BrowserWindow | null = null;
  private mode: ToolboxMode;

  constructor({ mode = 'normal' }: { mode?: ToolboxMode } = {}) {
    this.mode = mode;
    this.createWindow({ show: false });
  }

  private createWindow({
    show,
    bounds,
  }: {
    show: boolean;
    bounds?: WindowBounds;
  }) {
    const resolved = bounds ?? this.calculatePosition();

    this.window = new BrowserWindow({
      width: resolved.width,
      height: resolved.height,
      x: resolved.x,
      y: resolved.y,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: true,
      show,
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

  private calculatePosition(): WindowBounds {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const toolboxHeight = getToolboxHeight();

    // Position 460px from the right edge, centered vertically
    const x = screenWidth - TOOLBOX_WIDTH - TOOLBOX_MARGIN_RIGHT;
    const y = Math.floor((screenHeight - toolboxHeight) / 2);

    return { x, y, width: TOOLBOX_WIDTH, height: toolboxHeight };
  }

  public show() {
    if (!this.window) {
      this.createWindow({ show: false });
    }

    if (this.window) {
      // Ensure correct position before showing
      if (this.mode === 'normal') {
        const { x, y } = this.calculatePosition();
        this.window.setPosition(x, y);
      }

      this.window.show();
      this.window.focus();
    }
  }

  public showMinimizedNextTo(anchor: WindowBounds, gap = 32) {
    const width = 56;
    const bounds: WindowBounds = {
      x: anchor.x + anchor.width + gap,
      y: anchor.y,
      width,
      height: anchor.height,
    };

    this.mode = 'minimized';
    if (!this.window) this.createWindow({ show: true, bounds });

    const win = this.window;
    if (!win) return;

    win.setBounds(bounds);
    win.setResizable(false);
    win.setMinimumSize(width, 120);
    win.setMaximumSize(width, 10000);
    win.show();
    win.focus();
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
