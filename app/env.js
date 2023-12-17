/**
 * Canvas environment variables
 */

// Utils
const path = require('path')
const fs = require('fs')
const os = require('os')
const pkg = require('./package.json')
const isElectron = require('is-electron')()
const device = require('./managers/device').getCurrentDevice()


/**
 * App/System directories
 *
 * APP_ROOT
 * ├── app
 * ├── config
 * ├── user
 * ├── var
 * |   ├── .env
 * |   ├── log
 * |   ├── run
 * |   |   ├── canvas-ipc.sock
 * |   |   ├── canvas.pid
 * |   ├── tmp
 */

const APP_ROOT = path.dirname(path.resolve(__dirname))
const APP_HOME = path.join(APP_ROOT, 'app')
const APP_CONFIG = path.join(APP_ROOT, 'config')
const APP_VAR = path.join(APP_ROOT, 'var')

// Check for portable setup
const isPortable = ! fs.existsSync(path.join(APP_ROOT, 'user', '.ignore'))


/**
 * User directories
 *
 * APP_ROOT/user or os.homedir/.canvas
 * ├── config
 * ├── cache
 * ├── data
 * |   ├── abstr
 * |   |   ├── files
 * |   |   ├── notes
 * ├── db
 * |   ├── index
 * |   ├── documents
 * ├── var
 * |   ├── log
 * |   ├── run
 * |   |   ├── canvas-user-role.sock
 */

// User env
const USER_HOME = process.env['CANVAS_USER_HOME'] || getUserHome()
const USER_CACHE = process.env['CANVAS_USER_CACHE'] || path.join(USER_HOME, 'cache')
const USER_CONFIG = process.env['CANVAS_USER_CONFIG'] || path.join(USER_HOME, 'config')
const USER_DATA = process.env['CANVAS_USER_DATA'] || path.join(USER_HOME, 'data')
const USER_DB = process.env['CANVAS_USER_DB'] || path.join(USER_HOME, 'db')
const USER_VAR = process.env['CANVAS_USER_VAR'] || path.join(USER_HOME, 'var')

// Collect all ENV constants
const env = {
    APP: {
        name: (pkg.productName) ? pkg.productName : pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license,
        isElectron,
        isPortable,
        paths: {
            root: APP_ROOT,         // Path/to/canvas
            home: APP_HOME,         // APP_ROOT/app
            config: APP_CONFIG,     // APP_ROOT/config
            var: APP_VAR            // APP_ROOT/var
        }
    },

    USER: {
        // TODO: Rework
        ...device.user,
        paths: {
            // TODO: Rework (to-be-done before OS integration)
            homedir: device.os.homedir,
            // desktop
            // downloads
            home: USER_HOME,        // Path/to/canvas/user || ~/.canvas
            config: USER_CONFIG,    // USER_HOME/config
            cache: USER_CACHE,      // USER_HOME/cache
            data: USER_DATA,        // USER_HOME/data
            db: USER_DB,            // USER_HOME/db
            var: USER_VAR           // USER_HOME/var
        }
    },

    // TODO: Rework
    DEVICE: {
        id: device.id,
        endianness: device.endianness,
        type: device.type,
        os: device.os,
        network: device.network
    },

    PID: path.join(APP_VAR, 'run', 'canvas.pid'),
    IPC: (process.platform === 'win32') ?
        path.join('\\\\?\\pipe', process.cwd(), pkg.name) :
        path.join(APP_VAR, 'run', 'canvas.sock')

}

// Generate ini file (needed for non-nodejs processes)
// TODO: Rework
const INI = {
    // App
    CANVAS_APP_NAME: env.APP.name,
    CANVAS_APP_VERSION: env.APP.version,
    CANVAS_APP_DESCRIPTION: env.APP.description,
    CANVAS_APP_LICENSE: env.APP.license,
    CANVAS_APP_PORTABLE: env.APP.isPortable,
    CANVAS_PATHS_ROOT: env.APP.paths.root,
    CANVAS_PATHS_HOME: env.APP.paths.home,
    CANVAS_PATHS_CONFIG: env.APP.paths.config,
    CANVAS_PATHS_VAR: env.APP.paths.var,
    // User
    CANVAS_PATHS_USER_HOME: env.USER.paths.home,
    CANVAS_PATHS_USER_CONFIG: env.USER.paths.config,
    CANVAS_PATHS_USER_CACHE: env.USER.paths.cache,
    CANVAS_PATHS_USER_DATA: env.USER.paths.data,
    CANVAS_PATHS_USER_DB: env.USER.paths.db,
    CANVAS_PATHS_USER_VAR: env.USER.paths.var,
    // Process PID
    CANVAS_PID: env.PID,
    // Transport
    CANVAS_SOCK_IPC: env.IPC,
    // Developer settings
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
}

// Updates .env
generateDotenvFile(INI, path.join(APP_VAR, '.env'))

// Update process env vars
// We could just run require('dotenv').config() at this point
process.title = `${pkg.productName} | v${pkg.version}`
Object.assign(process.env, {...INI});

module.exports = env


/**
 * Utils
 */

function getUserHome() {
    return (isPortable) ? path.join(APP_ROOT, 'user') : path.join(os.homedir(), ".canvas");
}

async function ensureDirExists(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

/*
ensureDirExists(dirPath).then(() => {
    // ..
}).catch(err => {
    console.error('Failed to create directory', err);
}); */

function generateDotenvFile(iniVars, filePath) {

    let iniContent = '';

    Object.keys(iniVars).forEach((key) => {
        let value = iniVars[key];
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }

        iniContent += `${key}="${value}"\n`;
    });

    fs.writeFileSync(filePath, iniContent);
}
