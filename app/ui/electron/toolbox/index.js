'use strict'


/**
 * ui \ electron \ Toolbox
 */

const {
    app,
    BrowserWindow,
    screen,
    globalShortcut,
    ipcMain
} = require('electron')

//const log = app.utils.logger('ui.electron.toolbox')
const Window = require('../utils/wm/window')

const path = require('path')

const url = require('url').format({
    protocol: 'file',
    slashes: true,
    pathname: require('path').join(__dirname, 'front2', 'index.html')
})

class Toolbox {

    constructor() {

        // Local toolbox is a singleton
        this.remoteEnabled = false
        this.isVisible = false

        this.window = new Window({
            name: 'Context',
            title: 'Context',
            url: url,
            width: '640',
            height: '480',
            minWidth: 80,
            minHeight: 496,
            height: '100%',
            alwaysOnTop: true,
            fullscreenable: false,
            resizable: false,
            frame: false,
            show: true,
            transparent:true,
            webPreferences: {
                preload: path.join(__dirname, '/preload.js'),
                sandbox: false,
                nodeIntegration: true
            },

        })

        this.window.align('center', 0, 0)

        this.window.loadURL(url)
        this.window.webContents.openDevTools()



        this.window.on('close', e => {
            if (! app.isQuitting) {
                e.preventDefault()
                this.window.hide()
            }
        })

        globalShortcut.register('CommandOrControl+space', () => {
            app.toolbox.toggle()
        })

        globalShortcut.register('CommandOrControl+O', () => {
            app.toolbox.toggleDevTools()
        })

        globalShortcut.register('CommandOrControl+R', () => {
            app.toolbox.reload()
        })

    }

    dock() {}

    undock() {}

    isDocked() {}

    save() {}

    restore() {}

    toggle() {
        this.window.isVisible() ? this.window.hide() : this.window.show()
    }

    toggleDevTools() {
        this.window.webContents.openDevTools()
    }

    reload() {
        this.window.reload()
    }
}

module.exports = Toolbox

