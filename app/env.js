/**
 * Canvas environment variables
 */

// Utils
const path = require('path')
const fs = require('fs')
const os = require('os')
const pkg = require('./package.json')
const isElectron = require('is-electron')()
const device = require('./managers/Device')


/**
 * App/System directories
 *
 * APP_ROOT
 * ├── app
 * ├── config
 * ├── user
 * ├── var
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
            root: APP_ROOT,
            home: APP_HOME,
            config: APP_CONFIG,
            var: APP_VAR
        }
    },

    USER: {
        paths: {
            home: USER_HOME,
            config: USER_CONFIG,
            cache: USER_CACHE,
            data: USER_DATA,
            var: USER_VAR
        }
    },

    DEVICE: device,

    transport: {
        ipc: (process.platform === 'win32') ?
            path.join('\\\\?\\pipe', process.cwd(), pkg.name) :
            path.join(APP_VAR, 'run', `${pkg.name}-ipc.sock`)
    }
}


// Update process env vars
process.title = `${pkg.productName} | v${pkg.version}`
Object.assign(process.env, {

    // Developer settings
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

    // App
    CANVAS_APP_ROOT: APP_ROOT,
    CANVAS_APP_CONFIG: APP_CONFIG,
    CANVAS_APP_VAR: APP_VAR,

    // User
    CANVAS_USER_HOME: USER_HOME,
    CANVAS_USER_CONFIG: USER_CONFIG,
    CANVAS_USER_CACHE: USER_CACHE,
    CANVAS_USER_DATA: USER_DATA,
    CANVAS_USER_VAR: USER_VAR,

    // Export main IPC socket
    CANVAS_SOCK_IPC: env.transport.ipc

});

module.exports = env


/**
 * Utils
 */

function getUserHome() {
    return (isPortable) ? path.join(APP_ROOT, 'user') : path.join(os.homedir(), ".canvas");
}
