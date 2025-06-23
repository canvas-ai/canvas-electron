const EventEmitter = require('eventemitter2');
const { BrowserWindow, globalShortcut, screen } = require('electron');

class Toolbox extends EventEmitter {
    constructor() {
        super();
        this.window = null;
        this.state = 'hidden'; // 'hidden', 'narrow', 'wide'
        this.animating = false;
        this.narrowWidth = 96;
        this.wideWidth = 640;
        this.animationSpeed = 8; // milliseconds between frames
        this.animationStep = 32; // pixels per frame
        this.marginLeft = 150;
        this.marginTopBottom = 100;
    }

    // Getters/Setters
    get isVisible() {
        return this.window && this.window.isVisible();
    }

    get currentWidth() {
        return this.window ? this.window.getBounds().width : 0;
    }

    // Module initializer
    registerGlobalShortcut() {
        globalShortcut.register('Super+Shift+T', () => {
            this.multiStateToggle();
        });
    }

    // Core functionality methods
    show(width) {
        if (!this.window) {
            this.createWindow();
        }

        if (this.animating) return;

        this.window.show();
        this.animateToWidth(width);
    }

    hide() {
        if (this.window && !this.animating) {
            this.window.hide();
            this.state = 'hidden';
            this.emit('toolbox-hidden');
        }
    }

    multiStateToggle() {
        switch (this.state) {
            case 'hidden':
                this.state = 'wide';
                this.show(this.wideWidth);
                this.emit('toolbox-wide');
                break;
            case 'wide':
                this.state = 'narrow';
                this.animateToWidth(this.narrowWidth);
                this.emit('toolbox-narrow');
                break;
            case 'narrow':
                this.hide();
                break;
        }
        this.emit('toolbox-toggled', this.state);
    }

    // Animation methods
    animateToWidth(targetWidth) {
        if (this.animating) return;
        this.animating = true;

        const animate = () => {
            const currentBounds = this.window.getBounds();
            const currentWidth = currentBounds.width;
            let newWidth;

            if (currentWidth < targetWidth) {
                newWidth = Math.min(currentWidth + this.animationStep, targetWidth);
            } else {
                newWidth = Math.max(currentWidth - this.animationStep, targetWidth);
            }

            const newX = this.calculateXPosition(newWidth);

            this.window.setBounds({
                ...currentBounds,
                x: newX,
                width: newWidth
            });

            if (newWidth !== targetWidth) {
                setTimeout(animate, this.animationSpeed);
            } else {
                this.animating = false;
            }
        };

        animate();
    }

    // Private methods and utilities
    calculateXPosition(width) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { x: workAreaX, width: workAreaWidth } = primaryDisplay.workArea;

        // Position from right edge minus margin
        return workAreaX + workAreaWidth - width - this.marginLeft;
    }

    calculateWindowDimensions() {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { y: workAreaY, height: workAreaHeight } = primaryDisplay.workArea;

        return {
            x: this.calculateXPosition(this.narrowWidth),
            y: workAreaY + this.marginTopBottom,
            width: this.narrowWidth,
            height: workAreaHeight - (2 * this.marginTopBottom)
        };
    }

    createWindow() {
        const dimensions = this.calculateWindowDimensions();

        this.window = new BrowserWindow({
            width: dimensions.width,
            height: dimensions.height,
            x: dimensions.x,
            y: dimensions.y,
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
            this.state = 'hidden';
            this.animating = false;
        });

        // Re-enforce always on top when the window is shown
        this.window.on('show', () => {
            this.window.setAlwaysOnTop(true, 'screen-saver');
        });
    }
}

// Singleton
module.exports = new Toolbox();
