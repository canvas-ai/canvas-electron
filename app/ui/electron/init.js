// Electron
const {
    app,
    globalShortcut,
    protocol,
    BrowserWindow,
    screen
} = require('electron');

// Utils
const path = require('path');

// Environment variables
const {
    APP,
    USER,
    DEVICE
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
// The below should open a new Canvas instead of process.exit
const singleton = app.requestSingleInstanceLock()
if (!singleton) {
    console.error('Only one instance of this app is allowed')
    process.exit(1)
}

app.on('second-instance', (e, argv, cwd) => {
    if (!argv) return
    console.log('2nd instance CLI parser(TODO)')
    console.log(argv)

    // --open-*
    // --open-toolbox
    // --open-launcher
    // --open-canvas
    // --open-settings
    // --open-about

    // --insert-*

    // --remove-*
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
    copyright: 'iostream s.r.o. ©2022 | All rights reserved',
    authors: 'idnc_sk',
    website: 'https://getcanvas.org/',
    iconPath: path.join(__dirname, '../assets/logo_1024x1024.png')
})

/*
* Initialize core components
*/

/*
const Canvas = require('../../main.js')
const canvas = new Canvas({
    sessionEnabled: true,
    sessionRestoreOnStart: true,
    enableUserRoles: true,
    enableUserApps: true,
})*/

// Register custom protocols
registerProtocols()


/**
 * App init
 */

app.on('ready', async function () {

    // To be moved to window manager
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Register process signal handlers
    registerProcessSignalHandlers()

    // Register global event listeners
    registerGlobalEventListeners()

    // Register global shortcuts
    registerGlobalShortcuts()

    // Custom app variables
    app.ui = {}         // UI elements
    app.user = {}       // User variables
    app.device = DEVICE // Current device

    // Start the engine and initialize components
    //const canvas = new Canvas()
    //await canvas.start()
    //app.contextManager = canvas.contextManager
    //app.context = await canvas.createContext()


    // Load Tray
    let Tray = require('./components/tray')
    app.ui.tray = new Tray({
        title: app.getName()
    })


    /*
    On Linux, possible types are desktop, dock, toolbar, splash, notification.
    - The desktop type places the window at the desktop background window level 
      (kCGDesktopWindowLevel - 1). However, note that a desktop window will not receive 
      focus, keyboard, or mouse events. You can still use globalShortcut to receive 
      input sparingly.
    - The dock type creates a dock-like window behavior.
    - The toolbar type creates a window with a toolbar appearance.
    - The splash type behaves in a specific way. It is not draggable, even if the CSS 
      styling of the window's body contains -webkit-app-region: drag. This type is commonly 
      used for splash screens.        
    - The notification type creates a window that behaves like a system notification.    
    */

    // Load Canvas
    app.ui.canvas = new BrowserWindow({
        width: 1024,
        height: Math.round(height * 0.8),
        autoHideMenuBar: true,
        frame: false,
        type: 'toolbar',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    app.ui.canvas.setPosition(width - 1204, Math.round(height * 0.1));

    app.ui.toolbox = new BrowserWindow({
        width: 128,
        height: Math.round(height * 0.8),
        type: 'toolbar',
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },        
    })

    app.ui.toolbox.setPosition(width - 160, Math.round(height * 0.1));

    //window border color based on context/workspace color!
    app.ui.canvas.setTitle('Canvas UI | Add new note')
    app.ui.canvas.setVisibleOnAllWorkspaces(true)
    app.ui.canvas.loadFile(path.join(__dirname, 'applets', 'notes', 'frontend', 'index.html'))
    //app.ui.canvas.webContents.openDevTools()
    /*app.ui.canvas.on('close', (event) => {
        event.preventDefault(); // Prevent the close
        app.ui.canvas.hide(); // Hide the window
    });*/

    //app.ui.tray.on('click', () => app.ui.canvas.toggle())
    //globalShortcut.register('super+c', () => app.ui.canvas.toggle())

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
