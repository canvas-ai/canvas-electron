// 
const { 
    BrowserWindow,
    screen  
} = require('electron')

const localShortcut = require('electron-localshortcut')

const Window = require('./window')
const DEFAULT_WINDOW_CONFIG = {}

class WindowManager {

    constructor(persistentState = false) {
        this.activeWindows = new Map()
    }

    createSession() {}

    saveSession() {}

    restoreSession() {}

    destroySession() {}

    getWindow(id) {
        if (!this._windowExists(id)) {
            console.log(`BrowserWindow with ID ${id} does not exist`)
            return null
        }

        return this.activeWindows.get(id)
    }

    createWindow(config = {}) {

        let window = new Window(config)

        if (config.title) window.title = config.title
        if (config.url) window.loadURL(config.url)
        this.activeWindows.set(window.id, window)
        return window

    }


    cloneWindow(id) {}

    listWindows() {

    }

    saveWindow(id) {}

    restoreWindow(id) {}

    closeAllWindows(saveState = true, force = false) {
        if (saveState) { 
            this.saveAllWindows() 
        }

        while (this.activeWindows.length) {
            let window = this.activeWindows.pop()
            if (force) window.close() 
            window.destroy()
        }
    }

    saveAllWindows() {
        // foreach $window in MAP do
        // let w = this.windows[window.id]
        // if (!w.save()) unable to save window w.id
        // return true
    }

    restoreAllWindows() {
        // foreach $window in $savedState do
        // check if within bounds && restore || restore && align
    }

    getFocusedWindow() { return BrowserWindow.getFocusedWindow() }

    shareWindow() {}

    unshareWindow() {}

    dockWindow (targetWindowID) {
        console.log('window.dock()')
        return true
    }

    undockWindow () {
        console.log('window.undock()')
        return true
    }

    registerShortcut(id, shortcut, cb) {
        console.log(this.activeWindows.get(id))
        return localShortcut.register(this.activeWindows.get(id), shortcut, cb)
    }

    unregisterShortcut(id, shortcut) {
        return localShortcut.unregister(this.activeWindows.get(id), shortcut)
    }

    unregisterAllShortcuts(id) { 
        return localShortcut.unregisterAll(this.activeWindows.get(id))
    }

    enableAllShortcuts(id) { return localShortcut.enableAll(this.activeWindows.get(id)) }

    disableAllShortcuts(id) { return localShortcut.disableAll(this.activeWindows.get(id)) }

    _windowExists(id) { return this.activeWindows.has(id) }
    
}

module.exports = new WindowManager
