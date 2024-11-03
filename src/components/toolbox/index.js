const EventEmitter = require('eventemitter2');
const { BrowserWindow, globalShortcut } = require('electron');

class Toolbox extends EventEmitter {
    constructor() {
        super();
        this.tools = [];
        this.window = null;
        this.mode = 'default';
    }

    register(tool) {
        if (!tool.name) {throw new Error('Tool name is mandatory');}
        if (!tool.icon) {throw new Error('Tool icon is mandatory');}
        if (!tool.action) {throw new Error('Tool action is mandatory');}
        this.tools.push(tool);
        this.emit('tool-registered', tool);
    }

    unregister(tool) {
        const index = this.tools.indexOf(tool);
        if (index === -1) {return;}
        this.tools.splice(index, 1);
        this.emit('tool-unregistered', tool);
    }

    toggle() {
        this.emit('toolbox-toggled');
    }

    show() {
        if (!this.window) {
            this.createWindow();
        }
        this.window.show();
    }

    hide() {
        if (this.window) {
            this.window.hide();
        }
    }

    setMode(mode) {
        this.mode = mode;
        if (this.window) {
            this.window.webContents.send('set-mode', mode);
        }
    }

    toggleMode() {
        const modes = ['panel', 'default', 'extended'];
        const currentIndex = modes.indexOf(this.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.setMode(modes[nextIndex]);
    }

    registerGlobalShortcut() {
        globalShortcut.register('CommandOrControl+Shift+C', () => {
            if (this.window && this.window.isVisible()) {
                this.hide();
            } else {
                this.show();
            }
        });
    }

    createWindow() {
        this.window = new BrowserWindow({
            width: 480,
            height: 600,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        this.window.loadURL(`file://${__dirname}/../../public/index.html`);
        this.window.on('closed', () => {
            this.window = null;
        });
    }
}

// Singleton
module.exports = new Toolbox();
