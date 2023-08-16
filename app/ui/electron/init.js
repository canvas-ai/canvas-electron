'use strict'


// Electron
const {
    app,
    globalShortcut,
    protocol
} = require('electron')

// Utils
const path = require('path')

// Environment
const {
    user,
} = require('../../env')

const APP = require('../../env').app
console.log(APP)


// Set a few handy runtime variables
process.title = APP.name
app.setName(APP.name)
app.version = APP.version
app.isQuitting = false


// Enable default sandboxing
//app.enableSandbox()

// Lets take care of some electron defaults
app.setPath('appData', path.join(APP.var, 'run') )      //Per-user application data directory,
app.setPath('userData', user.home)      //The directory for storing app's configuration files
// Temporary data
//app.setPath('cache', APP.var.run)
//app.setPath('temp', APP.var.tmp)
// Logging and debug directories
//app.setAppLogsPath(APP.var.log)
//app.setPath('crashDumps', APP.var.run)



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


/*
* Bling-bling
*/

app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: `Version: ${app.getVersion()}`,
    copyright: 'iostream s.r.o. ©2022 | All rights reserved',
    authors: 'idnc_sk',
    website: 'https://getcanvas.org/',
    iconPath: path.join(__dirname, '../public/logo_1024x1024.png')
})


/**
 * Initialize the app runtime env
 */

const PubSub = require('pubsub-js');

/*
* App init
*/

app.on('ready', function () {

    registerGlobalEventListeners()
    /*
    registerGlobalShortcuts()
    registerProcessSignalHandlers()
    initialiseTransports()
    */

    /*
    * Start the main tray app
    */

    let Tray = require('./tray')
    app.tray = new Tray({
        //logPath: path.join(APP.var.log, 'tray'),
        configPath: path.join(APP.config, 'tray'),
        title: app.getName()
    })



    // Create new browser window
    const mainWindow = new BrowserWindow({
        webPreferences: {
        nodeIntegration: true,
        },
    });

    // Load Editor.js
    mainWindow.loadURL(path.join(__dirname, 'applets', 'notes', 'frontend', 'index.html'));
    mainWindow.show()

    /*
    * Main session object
    */

    app.session = {}

    /*
    * Initialize a toolbox singleton
    */

    let toolbox = require('./desktop')
    toolbox.init()



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
    process.on('SIGINT', () => {
        console.log('process > app.quit()')
        app.isQuitting = true
        app.quit()
    })
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

function initialiseTransports() {
    return true
}

function initialiseServiceWorkers() {

    app.services = {}
    /*
    * Start roles/worker processes
    */

    // Make sure PM2 is running
    // https://github.com/electron/electron/issues/8375#issuecomment-281811495
    //process.env['ELECTRON_NO_ASAR'] = true
    //process.env['ELECTRON_RUN_AS_NODE'] = true
    return true
}

function initialiseRoleWorkers() {}
