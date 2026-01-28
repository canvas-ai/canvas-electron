import { app, Menu, Tray, nativeImage, nativeTheme, type NativeImage, type MenuItemConstructorOptions } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

interface TrayOptions {
  onLauncherToggle?: () => void;
  launcherShortcut?: string;
  onQuit: () => void;
}

export class TrayManager {
  private tray: Tray;
  private options: TrayOptions;
  private icon: NativeImage;

  constructor(options: TrayOptions) {
    this.options = options;

    // Create tray icon
    this.icon = this.getIcon();
    this.tray = new Tray(this.icon);

    this.setupTray();
  }

  private getIcon(): NativeImage {
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';
    const prefersDark = nativeTheme.shouldUseDarkColors;

    const iconSize = isMac ? 18 : isWin ? 32 : 24;
    const fileName = isMac
      ? 'logo-bl_64x64.png' // template-style: color ignored, alpha used
      : prefersDark
        ? 'logo-wr_64x64.png'
        : 'logo-bl_64x64.png';

    const candidates = [
      // dev (electron runs out of dist/, cwd is repo root)
      join(process.cwd(), 'public/icons', fileName),
      join(process.cwd(), 'public/icons/logo_64x64.png'),
      // packaged (we copy icons into resources)
      join(process.resourcesPath, 'public/icons', fileName),
      join(process.resourcesPath, 'public/icons/logo_64x64.png'),
      // packaged fallback if we ever stuff it into asar
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

    // Fallback: small-but-visible dot, not a 1x1 "invisible tray" prank.
    return nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeFBMVEUAAAD///////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw4gH1AAAAJXRSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eH8jH6aUAAAABYktHRB6k3R0qAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAR0lEQVQY02NgQAXGJkYGJgZ2BjYGBgYWFiY2NjY2FhYWFhZWVlY2NjZ2dnYGBkYGJgYGLgEAAAD//wMAqzQGXh6VfJkAAAAASUVORK5CYII='
    );
  }

  private setupTray() {
    this.tray.setToolTip('Canvas UI - AI Assistant');

    // Create context menu
    this.updateContextMenu();

    // Launcher toggle is handled via shortcut and menu.
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
          label: 'Launcher',
          accelerator: this.options.launcherShortcut,
          click: () => this.options.onLauncherToggle?.(),
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

  public refresh() {
    this.updateContextMenu();
  }

  public destroy() {
    this.tray.destroy();
  }
}
