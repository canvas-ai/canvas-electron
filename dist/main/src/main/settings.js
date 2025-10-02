"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsWindow = void 0;
const electron_1 = require("electron");
const path_1 = require("path");
const events_1 = require("events");
class SettingsWindow extends events_1.EventEmitter {
    window = null;
    constructor() {
        super();
        this.createWindow();
    }
    createWindow() {
        this.window = new electron_1.BrowserWindow({
            width: 600,
            height: 800,
            minWidth: 500,
            minHeight: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: (0, path_1.join)(__dirname, 'preload.js'),
            },
        });
        // Load the settings renderer
        if (process.env.NODE_ENV === 'development') {
            this.window.loadURL('http://localhost:3000/settings.html');
        }
        else {
            this.window.loadFile((0, path_1.join)(__dirname, '../renderer/settings.html'));
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
    focus() {
        if (this.window) {
            this.window.focus();
        }
    }
    close() {
        if (this.window) {
            this.window.close();
        }
    }
    reload() {
        if (this.window) {
            this.window.reload();
        }
    }
    openDevTools() {
        if (this.window) {
            this.window.webContents.openDevTools({ mode: 'detach' });
        }
    }
}
exports.SettingsWindow = SettingsWindow;
//# sourceMappingURL=settings.js.map