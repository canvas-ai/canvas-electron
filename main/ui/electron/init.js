// Electron includes
const {
    app,
    globalShortcut,
    protocol,
    BrowserWindow,
    screen
} = require('electron');

// Utils
const path = require('path');



// TODO: Rework paths after refactoring,
// fetch paths from ~/.canvas/run/env.ini?


// Environment variables
const {
    APP,
    USER,
    DEVICE,
    PID,
    IPC
} = require('../../env.js');

// Set a few handy runtime variables
app.setName(APP.name)
app.version = APP.version
app.isQuitting = false

// Enable default sandboxing
app.enableSandbox()

// Lets take care of some electron defaults
const electronHome = path.join(USER.paths.home, 'electron')
app.setPath('appData', path.join(electronHome, 'appData'))
app.setPath('userData', path.join(electronHome, 'userData'))
app.setPath('cache', path.join(electronHome, 'cache'))
app.setPath('temp', path.join(electronHome, 'temp'))
app.setAppLogsPath(path.join(electronHome, 'log'))
app.setPath('crashDumps', path.join(electronHome, 'crashDumps'))

// Make sure only one instance of the app is running
// TODO: Open a new Canvas instead of process.exit
const singleton = app.requestSingleInstanceLock()
if (!singleton) {
    console.error('Only one instance of this app is allowed')
    process.exit(1)
}

app.on('second-instance', (e, argv, cwd) => {
    if (!argv) return
    console.log('2nd instance CLI parser(TODO)')
    console.log(argv)
})

// TODO: Replace with a global argv parser
if (process.argv.some(arg => arg === '-v' || arg === '--version')) {
    console.log('App: ' + app.getVersion())
    console.log('Chromium: ' + process.versions.chrome)
    process.exit()
}

app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: `Version: ${app.getVersion()}`,
    copyright: 'Zemetras ©2023 | All rights reserved',
    authors: 'idnc_sk',
    website: 'https://getcanvas.org/',
    iconPath: path.join(__dirname, '/assets/logo_1024x1024.png')
})


/*
* Initialize Canvas
*/

// TODO: Check if canvas server is running

// Register custom protocols
registerProtocols()


/**
 * Initialize Electron UI
 */

app.on('ready', () => {

    // Globals
    registerProcessSignalHandlers()
    registerGlobalEventListeners()
    registerGlobalShortcuts()

    // UI elements
    app.ui = {}

    // Load Tray
    const Tray = require('./components/tray')
    const tray = new Tray({
        title: app.getName(),
        icon: path.join(__dirname, 'assets/logo_1024x1024_v2.png')
    })

    console.log(tray)

})


/**
 * Init functions
 */

function registerGlobalShortcuts() {
    return true
}

function registerGlobalEventListeners() {

    // MacOS support was blatantly ignored for now
    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        console.log('app.activate (TODO)')
    })

    // Apparently need to keep this one around to avoid app->quit()
    app.on('window-all-closed', (e) => {
        console.log('app.window-all-closed')
    })

    // Before all windows are closed
    app.on('before-quit ', function (e) {
        console.log('app.before-quit')
    })

    // After all windows are closed
    app.on('will-quit', function (e) {
        console.log('app.will-quit')
        globalShortcut.unregisterAll()
        //daemon.clearPidFile()
    })
}

function registerProcessSignalHandlers() {
/*    process.on('SIGINT', () => {
        console.log('process > app.quit()')
        app.isQuitting = true
        app.quit() ||process.exit(0)
    })
    */
}

function registerProtocols() {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: 'universe',
            privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true }
        },
        {
            scheme: 'context',
            privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true }
        }
    ])
}
