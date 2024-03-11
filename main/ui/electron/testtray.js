const { Tray, Menu } = require('electron');

// Define a CustomTray class that extends the Tray class
class CustomTray extends Tray {
    constructor(iconPath) {

        console.log('tu')
        console.log(iconPath)
        // Call the parent constructor with the icon path
        super(iconPath);

        console.log('tutu')

        // Set a tooltip for the tray icon as an example of customization
        this.setToolTip('This is my custom tray!');

        // You can also bind context menus or other events specific to this tray
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Item1', type: 'radio' },
            { label: 'Item2', type: 'radio' }
        ]);

        // Set the context menu for the tray icon
        this.setContextMenu(contextMenu);
    }

    // You can add custom methods as well
    displayMessage() {
        console.log('This is a message from the custom tray!');
    }
}

module.exports = CustomTray;
