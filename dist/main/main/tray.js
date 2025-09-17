"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrayManager = void 0;
const electron_1 = require("electron");
const path_1 = require("path");
class TrayManager {
    tray;
    options;
    constructor(options) {
        this.options = options;
        // Create tray icon
        const iconPath = this.getIconPath();
        this.tray = new electron_1.Tray(iconPath);
        this.setupTray();
    }
    getIconPath() {
        // Try to find the icon in different locations
        const possiblePaths = [
            (0, path_1.join)(__dirname, '../../public/icons/logo_1024x1024_v2.png'),
            (0, path_1.join)(process.resourcesPath, 'public/icons/logo_1024x1024_v2.png'),
            (0, path_1.join)(__dirname, '../../../public/icons/logo_1024x1024_v2.png'),
        ];
        // For now, create a simple icon if none found
        for (const path of possiblePaths) {
            try {
                return path;
            }
            catch (error) {
                continue;
            }
        }
        // Fallback to a simple native image
        return electron_1.nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==').toDataURL();
    }
    setupTray() {
        this.tray.setToolTip('Canvas UI - AI Assistant');
        // Create context menu
        this.updateContextMenu();
        // Handle double click
        this.tray.on('double-click', () => {
            this.options.onToolboxToggle();
        });
    }
    updateContextMenu() {
        const contextMenu = electron_1.Menu.buildFromTemplate([
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
    destroy() {
        this.tray.destroy();
    }
}
exports.TrayManager = TrayManager;
//# sourceMappingURL=tray.js.map