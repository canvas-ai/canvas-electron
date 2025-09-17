import { app, Menu, Tray, nativeImage } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

interface TrayOptions {
  onToolboxToggle: () => void;
  onSettingsOpen: () => void;
  onQuit: () => void;
}

export class TrayManager {
  private tray: Tray;
  private options: TrayOptions;

  constructor(options: TrayOptions) {
    this.options = options;
    
    // Create tray icon
    const iconPath = this.getIconPath();
    this.tray = new Tray(iconPath);
    
    this.setupTray();
  }

  private getIconPath(): string {
    // Try to find the icon in different locations
    const possiblePaths = [
      join(__dirname, '../../public/icons/logo_1024x1024_v2.png'),
      join(process.resourcesPath, 'public/icons/logo_1024x1024_v2.png'),
      join(__dirname, '../../../public/icons/logo_1024x1024_v2.png'),
    ];

    // Check each path for file existence
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Fallback to a simple native image
    return nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ).toDataURL();
  }

  private setupTray() {
    this.tray.setToolTip('Canvas UI - AI Assistant');
    
    // Create context menu
    this.updateContextMenu();

    // Handle double click
    this.tray.on('double-click', () => {
      this.options.onToolboxToggle();
    });
  }

  private updateContextMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Canvas UI',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Toolbox',
        accelerator: 'Super+Space',
        click: () => this.options.onToolboxToggle(),
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => this.options.onSettingsOpen(),
      },
      {
        label: 'Debug Tools',
        submenu: [
          {
            label: 'Open DevTools',
            click: () => {
              // This could open devtools for the toolbox window
              console.log('Debug tools requested');
            },
          },
          {
            label: 'Reload Toolbox',
            click: () => {
              // This could reload the toolbox window
              console.log('Reload requested');
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'About',
        click: () => {
          app.showAboutPanel();
        },
      },
      { type: 'separator' },
      {
        label: 'Exit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => this.options.onQuit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public destroy() {
    this.tray.destroy();
  }
}