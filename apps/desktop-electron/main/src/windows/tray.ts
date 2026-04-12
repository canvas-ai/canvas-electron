import { app, Menu, Tray, nativeImage, nativeTheme, type NativeImage } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

interface TrayOptions {
  onLauncherToggle?: () => void;
  onMenuToggle?: () => void;
  onToolboxToggle?: () => void;
  launcherShortcut?: string;
  menuShortcut?: string;
  toolboxShortcut?: string;
  onQuit: () => void;
}

function formatShortcut(accelerator: string | undefined): string {
  if (!accelerator) return '';
  const isMac = process.platform === 'darwin';
  return accelerator
    .replace(/CommandOrControl/g, isMac ? 'Cmd' : 'Ctrl')
    .replace(/Command/g, 'Cmd')
    .replace(/Control/g, 'Ctrl')
    .replace(/\bLeft\b/g, '←')
    .replace(/\bRight\b/g, '→')
    .replace(/\bUp\b/g, '↑')
    .replace(/\bDown\b/g, '↓')
    .replace(/\bSpace\b/g, 'Space');
}

export class TrayManager {
  private tray: Tray;
  private options: TrayOptions;
  private icon: NativeImage;

  constructor(options: TrayOptions) {
    this.options = options;
    this.icon = this.getIcon();
    this.tray = new Tray(this.icon);
    this.setupTray();
  }

  public refresh() {
    this.updateContextMenu();
  }

  public destroy() {
    this.tray.destroy();
  }

  // ── Setup ────────────────────────────────────────────────

  private setupTray() {
    this.tray.setToolTip('Canvas UI - AI Assistant');
    this.updateContextMenu();
  }

  private updateContextMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Canvas UI',
        enabled: false,
      },
      { type: 'separator' },
      ...(this.options.onLauncherToggle
        ? [{
          label: this.options.launcherShortcut
            ? `Launcher (${formatShortcut(this.options.launcherShortcut)})`
            : 'Launcher',
          accelerator: this.options.launcherShortcut,
          click: () => this.options.onLauncherToggle?.(),
        }]
        : []),
      ...(this.options.onMenuToggle
        ? [{
          label: this.options.menuShortcut
            ? `Menu (${formatShortcut(this.options.menuShortcut)})`
            : 'Menu',
          accelerator: this.options.menuShortcut,
          click: () => this.options.onMenuToggle?.(),
        }]
        : []),
      ...(this.options.onToolboxToggle
        ? [{
          label: this.options.toolboxShortcut
            ? `Toolbox (${formatShortcut(this.options.toolboxShortcut)})`
            : 'Toolbox',
          accelerator: this.options.toolboxShortcut,
          click: () => this.options.onToolboxToggle?.(),
        }]
        : []),
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

  // ── Icon ─────────────────────────────────────────────────

  private getIcon(): NativeImage {
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';
    const prefersDark = nativeTheme.shouldUseDarkColors;

    const iconSize = isMac ? 18 : isWin ? 32 : 24;
    const fileName = isMac
      ? 'logo-bl_64x64.png'
      : prefersDark
        ? 'logo-wr_64x64.png'
        : 'logo-bl_64x64.png';

    const candidates = [
      join(process.cwd(), 'public/icons', fileName),
      join(process.cwd(), 'public/icons/logo_64x64.png'),
      join(process.resourcesPath, 'public/icons', fileName),
      join(process.resourcesPath, 'public/icons/logo_64x64.png'),
      join(app.getAppPath(), 'public/icons', fileName),
      join(app.getAppPath(), 'public/icons/logo_64x64.png'),
    ];

    for (const filePath of candidates) {
      if (!existsSync(filePath)) continue;
      const img = nativeImage.createFromPath(filePath);
      if (img.isEmpty()) continue;
      const sized = img.resize({ width: iconSize, height: iconSize });
      if (isMac) sized.setTemplateImage(true);
      return sized;
    }

    return nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeFBMVEUAAAD///////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw4gH1AAAAJXRSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eH8jH6aUAAAABYktHRB6k3R0qAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAR0lEQVQY02NgQAXGJkYGJgZ2BjYGBgYWFiY2NjY2FhYWFhZWVlY2NjZ2dnYGBkYGJgYGLgEAAAD//wMAqzQGXh6VfJkAAAAASUVORK5CYII='
    );
  }
}
