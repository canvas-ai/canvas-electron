/**
 * Canvas
 */

// Environment variables
const {
    app,
    server,
    user,
} = require('./env.js');

// Utils
const path = require('path');
const debug = require('debug')('canvas');

// App utils
const Config = require('./utils/config/index.js');
const log = require('./utils/log/index.js');

// Electron includes
const {
    app,
    globalShortcut,
    protocol,
    BrowserWindow,
    Tray,
    nativeImage,
} = require('electron');

// Set a few handy runtime variables
app.setName(APP.name);
app.version = APP.version;
app.isQuitting = false;

// Enable default sandboxing
app.enableSandbox();

// Lets take care of some electron defaults
const electronHome = path.join(USER.paths.home, 'electron');    // Stash electron-generated garbage here
app.setPath('appData', path.join(electronHome, 'appData'));
app.setPath('userData', path.join(electronHome, 'userData'));
app.setPath('cache', path.join(electronHome, 'cache'));
app.setPath('temp', path.join(electronHome, 'temp'));
app.setAppLogsPath(path.join(electronHome, 'log'));
app.setPath('crashDumps', path.join(electronHome, 'crashDumps'));

// Make sure only one instance of the app is running
const singleton = app.requestSingleInstanceLock();
if (!singleton) {
    console.error('Only one instance of this app is allowed');
    process.exit(1);
    // TODO: Open a new Canvas window instead
}

app.on('second-instance', (e, argv, cwd) => {
    if (!argv) {return;}
    console.log('2nd instance CLI parser(TODO)');
    console.log(argv);
});

// TODO: Replace with a global argv parser
if (process.argv.some(arg => arg === '-v' || arg === '--version')) {
    console.log('App: ' + app.getVersion());
    console.log('Chromium: ' + process.versions.chrome);
    process.exit();
}

const Canvas = require('../server/main.js');
const canvas = new Canvas({
    mode: serverMode,
    app: app,
    paths: {
        server: server.paths,
        user: user.paths,
    },
});

app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: `Version: ${app.getVersion()}`,
    copyright: 'Zemetras ©2024 | All rights reserved',
    authors: 'idnc_sk',
    website: 'https://getcanvas.org/',
    iconPath: path.join(__dirname, '/public/icons/logo_1024x1024_v2.png'),
});

// Register custom protocols
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'universe',
        privileges: { standard: true, secure: false, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true },
    },
    {
        scheme: 'context',
        privileges: { secure: true, standard: false, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true },
    },
]);

app.on('ready', async () => {
    debug('App ready');
    createWindow();

    const tray = new Tray(path.resolve(__dirname, '..', 'public', 'icons', 'logo_1024x1024_v2.png'));
    //await createTrayMenu(tray);

});

// MacOS support was blatantly ignored for now
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Apparently need to keep this one around to avoid app->quit()
app.on('window-all-closed', () => {
    console.log('app.window-all-closed');
});

// Before all windows are closed
app.on('before-quit ', function () {
    console.log('app.before-quit');
});

// After all windows are closed
app.on('will-quit', function () {
    console.log('app.will-quit');
    globalShortcut.unregisterAll();
});

process.on('SIGINT', () => {
    console.log('process > app.quit()');
    app.isQuitting = true;
    app.quit() || process.exit(0);
});


function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
}
