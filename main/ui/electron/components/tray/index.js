const { app, Menu, MenuItem, Tray } = require("electron");
const debug = require('debug')('canvas-ui:tray');
const EventEmitter = require('eventemitter2');

class CanvasTray { // extends Tray {

    constructor(options = {}) {
        // Parse input parms
        if (!options.title) throw new Error('"title" is a mandatory parameter');
        if(!options.icon) throw new Error('"icon" is a mandatory parameter');

        // This is more a workaround than proper code
        // https://github.com/electron/electron/issues/36269
        this.title = options.title
        this.icon = options.icon

        // Initialize Electron.Tray
        this.tray = new Tray(this.icon)
        this.tray.setTitle(this.title);
        this.tray.setToolTip(this.title);

        this.updateTrayMenu();
        debug('Canvas Tray ready');
    }

    // Event handler proxy
    on(event, listener) {
        this.tray.on(event, listener);
    }

    updateTrayMenu() {
        debug('Updating Tray menu')
        const menu = new Menu();
        menu.append(new MenuItem({ label: this.title, enabled: false }));
        menu.append(new MenuItem({ type: "separator" }));
        menu.append(new MenuItem({ label: "Toolbox", click: () => app.toolbox.toggle() }));
        menu.append(new MenuItem({ type: "separator" }));
        menu.append(new MenuItem({ label: "Settings", click: () => console.log("Settings window") }));
        menu.append(new MenuItem({ label: "About", click: () => app.showAboutPanel(), role: "about" }));
        menu.append(new MenuItem({ type: "separator" }));
        menu.append(new MenuItem({ label: "Exit", click: () => { app.isQuitting = true; app.quit(); }, accelerator: "Command+Q" }));
        this.tray.setContextMenu(menu);
    }

}

module.exports = CanvasTray;
