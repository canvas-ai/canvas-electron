const EventEmitter = require('eventemitter2');
const { BrowserWindow, globalShortcut, screen } = require('electron');

class Canvas extends EventEmitter {
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
        this.emit('Canvas-toggled');
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
        globalShortcut.register('Super+Space', () => {
            if (this.window && this.window.isVisible()) {
                this.hide();
            } else {
                this.show();
            }
        });
    }

    createWindow() {
        // Get primary display dimensions
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth } = primaryDisplay.workAreaSize;

        // Calculate x position: screen width - window width - 200px margin from right
        const windowWidth = 640;
        const xPosition = screenWidth - windowWidth - 200;

        this.window = new BrowserWindow({
            width: windowWidth,
            height: 905,
            x: xPosition,
            y: 140,
            frame: false,
            transparent: false,
            alwaysOnTop: true,
            resizable: false,
            skipTaskbar: true,
            type: 'toolbar', // Ensures it behaves like a toolbar on Linux
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        // Ensure the window stays on top
        this.window.setAlwaysOnTop(true, 'screen-saver');

        // Set high z-level to ensure it's above other windows
        this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

        this.window.on('closed', () => {
            this.window = null;
        });

        // Re-enforce always on top when the window is shown
        this.window.on('show', () => {
            this.window.setAlwaysOnTop(true, 'screen-saver');
        });
    }
}

// Singleton
module.exports = new Canvas();
