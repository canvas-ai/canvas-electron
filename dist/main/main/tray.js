"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrayManager = void 0;
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
class TrayManager {
    tray;
    options;
    icon;
    constructor(options) {
        this.options = options;
        // Create tray icon
        this.icon = this.getIcon();
        this.tray = new electron_1.Tray(this.icon);
        this.setupTray();
    }
    getIcon() {
        const isMac = process.platform === 'darwin';
        const isWin = process.platform === 'win32';
        const prefersDark = electron_1.nativeTheme.shouldUseDarkColors;
        const iconSize = isMac ? 18 : isWin ? 32 : 24;
        const fileName = isMac
            ? 'logo-bl_64x64.png' // template-style: color ignored, alpha used
            : prefersDark
                ? 'logo-wr_64x64.png'
                : 'logo-bl_64x64.png';
        const candidates = [
            // dev (electron runs out of dist/, cwd is repo root)
            (0, path_1.join)(process.cwd(), 'public/icons', fileName),
            (0, path_1.join)(process.cwd(), 'public/icons/logo_64x64.png'),
            // packaged (we copy icons into resources)
            (0, path_1.join)(process.resourcesPath, 'public/icons', fileName),
            (0, path_1.join)(process.resourcesPath, 'public/icons/logo_64x64.png'),
            // packaged fallback if we ever stuff it into asar
            (0, path_1.join)(electron_1.app.getAppPath(), 'public/icons', fileName),
            (0, path_1.join)(electron_1.app.getAppPath(), 'public/icons/logo_64x64.png'),
        ];
        for (const filePath of candidates) {
            if (!(0, fs_1.existsSync)(filePath))
                continue;
            const img = electron_1.nativeImage.createFromPath(filePath);
            if (img.isEmpty())
                continue;
            const sized = img.resize({ width: iconSize, height: iconSize });
            if (isMac)
                sized.setTemplateImage(true);
            return sized;
        }
        // Fallback: small-but-visible dot, not a 1x1 "invisible tray" prank.
        return electron_1.nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeFBMVEUAAAD///////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw4gH1AAAAJXRSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eH8jH6aUAAAABYktHRB6k3R0qAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAR0lEQVQY02NgQAXGJkYGJgZ2BjYGBgYWFiY2NjY2FhYWFhZWVlY2NjZ2dnYGBkYGJgYGLgEAAAD//wMAqzQGXh6VfJkAAAAASUVORK5CYII=');
    }
    setupTray() {
        this.tray.setToolTip('Canvas UI - AI Assistant');
        // Create context menu
        this.updateContextMenu();
        // Handle double click
        this.tray.on('double-click', () => {
            if (this.options.isToolboxEnabled?.() === false)
                return;
            this.options.onToolboxToggle();
        });
    }
    updateContextMenu() {
        const canvases = this.options.getCanvases?.() ?? [];
        const canvasesSubmenu = canvases.length === 0
            ? [{ label: 'No canvases', enabled: false }]
            : canvases.map((c) => ({
                label: c.label,
                type: 'radio',
                checked: c.isActive,
                click: () => this.options.onCanvasFocus?.(c.id),
            }));
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Canvas UI',
                enabled: false,
            },
            { type: 'separator' },
            {
                label: 'Canvases',
                submenu: canvasesSubmenu,
            },
            {
                label: 'Toolbox',
                accelerator: 'Super+Space',
                enabled: this.options.isToolboxEnabled?.() !== false,
                click: () => this.options.onToolboxToggle(),
            },
            {
                label: 'Debug Tools',
                submenu: [
                    {
                        label: 'Open Canvas DevTools',
                        click: () => {
                            this.options.onOpenCanvasDevTools?.();
                        },
                    },
                    {
                        label: 'Reload Canvas UI',
                        click: () => {
                            this.options.onReloadCanvas?.();
                        },
                    },
                    { type: 'separator' },
                    {
                        label: 'Open Toolbox DevTools',
                        click: () => {
                            this.options.onOpenToolboxDevTools?.();
                        },
                    },
                    {
                        label: 'Reload Toolbox',
                        click: () => {
                            this.options.onReloadToolbox?.();
                        },
                    },
                ],
            },
            { type: 'separator' },
            {
                label: 'About',
                click: () => {
                    electron_1.app.showAboutPanel();
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
    refresh() {
        this.updateContextMenu();
    }
    destroy() {
        this.tray.destroy();
    }
}
exports.TrayManager = TrayManager;
//# sourceMappingURL=tray.js.map