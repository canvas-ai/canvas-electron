"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolboxWindow = void 0;
const electron_1 = require("electron");
const path_1 = require("path");
const constants_1 = require("../shared/constants");
class ToolboxWindow {
    window = null;
    constructor() {
        this.createWindow();
    }
    createWindow() {
        const { x, y } = this.calculatePosition();
        const height = (0, constants_1.getToolboxHeight)();
        this.window = new electron_1.BrowserWindow({
            width: constants_1.TOOLBOX_WIDTH,
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
                preload: (0, path_1.join)(__dirname, 'preload.js'),
            },
        });
        // Load the toolbox renderer
        if (process.env.NODE_ENV === 'development') {
            this.window.loadURL('http://localhost:3000/toolbox.html');
            // this.window.webContents.openDevTools({ mode: 'detach' });
        }
        else {
            this.window.loadFile((0, path_1.join)(__dirname, '../../renderer/toolbox.html'));
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
    calculatePosition() {
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const toolboxHeight = (0, constants_1.getToolboxHeight)();
        // Position 460px from the right edge, centered vertically
        const x = screenWidth - constants_1.TOOLBOX_WIDTH - constants_1.TOOLBOX_MARGIN_RIGHT;
        const y = Math.floor((screenHeight - toolboxHeight) / 2);
        return { x, y };
    }
    show() {
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
    hide() {
        if (this.window) {
            this.window.hide();
        }
    }
    focus() {
        if (this.window) {
            this.window.focus();
        }
    }
    isVisible() {
        return this.window ? this.window.isVisible() : false;
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
exports.ToolboxWindow = ToolboxWindow;
//# sourceMappingURL=toolbox.js.map