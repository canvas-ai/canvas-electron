const EventEmitter = require('eventemitter2');
const { BrowserWindow, globalShortcut, screen } = require('electron');

class Context extends EventEmitter {
    constructor() {
        super();
        this.window = null;
        this.visible = false;
        this.animating = false;
        this.targetWidth = 640;
        this.hiddenWidth = 1;
        this.animationSpeed = 10; // milliseconds between frames
        this.animationStep = 128; // pixels per frame
        this.alignment = 'left'; // 'left' or 'right'
    }

    // Getters/Setters
    get isVisible() {
        return this.window && this.window.isVisible();
    }

    // Module initializer
    registerGlobalShortcut() {
        globalShortcut.register('Super+Shift+C', () => {
            this.toggle();
        });
    }

    // Configuration methods
    setAlignment(alignment) {
        if (alignment !== 'left' && alignment !== 'right') {
            throw new Error('Alignment must be "left" or "right"');
        }
        this.alignment = alignment;

        // Update window position if window exists
        if (this.window) {
            this.updateWindowPosition();
        }
    }

    // Core functionality methods
    show() {
        if (!this.window) {
            this.createWindow();
        }

        if (this.animating) return;

        this.window.show();
        this.visible = true;
        this.slideOut();
        this.emit('context-shown');
    }

    hide() {
        if (this.window && !this.animating) {
            this.slideIn();
        }
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
        this.emit('context-toggled');
    }

        // Animation methods
    slideOut() {
        if (this.animating) return;
        this.animating = true;

        const animate = () => {
            const currentBounds = this.window.getBounds();
            const newWidth = Math.min(currentBounds.width + this.animationStep, this.targetWidth);
            const newX = this.calculateXPosition(newWidth);

            this.window.setBounds({
                ...currentBounds,
                x: newX,
                width: newWidth
            });

            if (newWidth < this.targetWidth) {
                setTimeout(animate, this.animationSpeed);
            } else {
                this.animating = false;
            }
        };

        animate();
    }

    slideIn() {
        if (this.animating) return;
        this.animating = true;

        const animate = () => {
            const currentBounds = this.window.getBounds();
            const newWidth = Math.max(currentBounds.width - this.animationStep, this.hiddenWidth);
            const newX = this.calculateXPosition(newWidth);

            this.window.setBounds({
                ...currentBounds,
                x: newX,
                width: newWidth
            });

            if (newWidth > this.hiddenWidth) {
                setTimeout(animate, this.animationSpeed);
            } else {
                this.animating = false;
                this.visible = false;
                this.window.hide();
                this.emit('context-hidden');
            }
        };

        animate();
    }

    // Private methods and utilities
        calculateXPosition(width) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { x: workAreaX, width: workAreaWidth } = primaryDisplay.workArea;

        if (this.alignment === 'right') {
            return workAreaX + workAreaWidth - width;
        }
        return workAreaX; // left alignment
    }

    updateWindowPosition() {
        if (!this.window) return;

        const currentBounds = this.window.getBounds();
        const newX = this.calculateXPosition(currentBounds.width);

        this.window.setBounds({
            ...currentBounds,
            x: newX
        });
    }

    createWindow() {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { y: workAreaY, height: workAreaHeight } = primaryDisplay.workArea;
        const initialX = this.calculateXPosition(this.hiddenWidth);

        this.window = new BrowserWindow({
            width: this.hiddenWidth, // Start with minimal width
            height: workAreaHeight,
            x: initialX,
            y: workAreaY,
            frame: false,
            transparent: false,
            alwaysOnTop: true,
            resizable: false,
            skipTaskbar: true,
            type: 'toolbar',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        // Ensure the window stays on top
        this.window.setAlwaysOnTop(true, 'screen-saver');
        this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

        this.window.on('closed', () => {
            this.window = null;
            this.visible = false;
            this.animating = false;
        });

        // Re-enforce always on top when the window is shown
        this.window.on('show', () => {
            this.window.setAlwaysOnTop(true, 'screen-saver');
        });
    }
}

// Singleton
module.exports = new Context();
