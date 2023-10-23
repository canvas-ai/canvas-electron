/**
 * UI \ Electron \ Tray
 */

const { app, Menu, MenuItem, Tray, shell } = require("electron");

// Utils
const path = require("path");
const debug = require("debug")("ui-electron-tray");

/**
 * Canvas Tray
 */

class CanvasTray extends Tray {

  constructor(options = {}) {
    options = {
      title: "Tray",
      icon: path.resolve(__dirname, "../../../assets/logo_1024x1024.png"),
      ...options,
    };

    // Initialize the Electron Tray object
    super(options.icon);

    // Set tray properties
    this.title = options.title;

    // https://github.com/electron/electron/issues/28131
    this.setToolTip(options.title);
    this.setTitle(options.title);

    this.updateTrayMenu();
    this.setIgnoreDoubleClickEvents(true);
  }

  updateTrayMenu() {
    debug("Updating tray menu");
    this.setContextMenu(null);
    let menu = new Menu();

    menu.append(new MenuItem({ label: this.title, enabled: false }));
    menu.append(new MenuItem({ type: "separator" }));
    menu.append(
      new MenuItem({
        label: "Toolbox",
        click() {
          app.toolbox.toggle();
        },
      })
    );

    menu.append(new MenuItem({ type: "separator" }));
    menu.append(
      new MenuItem({
        label: "Settings",
        click() {
          log("Settings window");
        },
      })
    );

    menu.append(
      new MenuItem({
        label: "About",
        click() {
          app.showAboutPanel();
        },
        role: "about",
      })
    );

    menu.append(new MenuItem({ type: "separator" }));
    menu.append(
      new MenuItem({
        label: "Exit",
        click() {
          console.log("Exit from tray");
          app.isQuitting = true;
          console.log(app.quit());
          process.exit(0);
        },
        accelerator: "Command+Q",
      })
    );

    this.setContextMenu(menu);
  }
}

module.exports = CanvasTray;
