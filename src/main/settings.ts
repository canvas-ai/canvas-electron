import { BrowserWindow } from 'electron';
import { join } from 'path';
import { EventEmitter } from 'events';

export class SettingsWindow extends EventEmitter {
  private window: BrowserWindow | null = null;

  constructor() {
    super();
    this.createWindow();
  }

  private createWindow() {
    this.window = new BrowserWindow({
      width: 600,
      height: 800,
      minWidth: 500,
      minHeight: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
      },
    });

    // Load the settings renderer
    if (process.env.NODE_ENV === 'development') {
      this.window.loadURL('http://localhost:3000/settings.html');
    } else {
      this.window.loadFile(join(__dirname, '../renderer/settings.html'));
    }

    // Window event handlers
    this.window.on('closed', () => {
      this.window = null;
      this.emit('closed');
    });

    this.window.on('ready-to-show', () => {
      if (this.window) {
        this.window.show();
        this.window.focus();
      }
    });
  }

  public focus() {
    if (this.window) {
      this.window.focus();
    }
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