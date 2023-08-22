/**
 * Canvas environment "bootstrap"
 */

// Utils
const path = require('path')
const fs = require('fs')
const os = require('os')
const isElectron = require('is-electron')()
const pkg = require('./package.json')
const device = require('./utils/device')


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

/**
 * User directories
 *
 * APP_ROOT/user or ~/.canvas
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
const USER_HOME = getUserHome()
const USER_CONFIG = path.join(USER_HOME, 'config')
const USER_CACHE = path.join(USER_HOME, 'cache')
const USER_DATA = path.join(USER_HOME, 'data')
const USER_VAR = path.join(USER_HOME, 'var')


// Initialize the global config module
const Config = require('./utils/config')
const config = Config({
    userConfigDir: USER_CONFIG,
    appConfigDir: APP_CONFIG,
    versioning: false
})

// Initialize the logging module
const Log = require('./utils/logger')
const logger = new Log({
    appName: pkg.name,
    logLevel: process.env.LOG_LEVEL || 'debug',
    logPath: path.join(USER_VAR, 'log')
})


const env = {
    app: {
        // App package info
        name: (pkg.productName) ? pkg.productName : pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license,
        isElectron,
        paths: {
            // App directories
            root: APP_ROOT,
            home: APP_HOME,
            config: APP_CONFIG,
            var: APP_VAR
        }
    },

    user: {
        paths: {
            // User directories
            home: USER_HOME,
            config: USER_CONFIG,
            cache: USER_CACHE,
            data: USER_DATA,
            var: USER_VAR
        }
    },

    device,

    transport: {
        ipc: (process.platform === 'win32') ?
            path.join('\\\\?\\pipe', process.cwd(), pkg.name) :
            path.join(APP_VAR, 'run', `${pkg.name}-ipc.sock`)
    },

    config,
    logger

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
    CANVAS_USER_DATA: USER_DATA,
    CANVAS_USER_VAR: USER_VAR,

    // Export main IPC socket
    CANVAS_SOCK_IPC: env.transport.ipc

});


module.exports = env


/**
 * Utils
 */

// TODO: Rework, ugly
function getUserHome() {

    // If CANVAS_USER_HOME was supplied explicitly, return it.
    if (process.env.CANVAS_USER_HOME) {
        return process.env.CANVAS_USER_HOME;
    }

    // If CANVAS_PORTABLE was set, return the portable user dir.
    if (process.env.CANVAS_PORTABLE) {
        return path.join(APP_ROOT, 'user');
    }

    // Check for portable setup and return user directory if portable mode is disabled.
    if (!fs.existsSync(path.join(APP_ROOT, 'user', '.ignore'))) {
        return path.join(APP_ROOT, 'user');
    }

    // Default: Fallback to the local OS home directory.
    return path.join(os.homedir(), ".canvas");
}


function checkObjectAgainstSchema(obj, schema) {

    // Check that all required properties are present in the object
    Object.keys(schema).forEach((key) => {
        assert(obj.hasOwnProperty(key), `Object is missing required property: ${key}`);
    })

    // Check that all properties in the object have the correct type
    Object.keys(obj).forEach((key) => {
        if (typeof schema[key] === 'object' && schema[key] !== null) {
            // If the schema property is an object, recursively check the object against the nested schema
            checkObjectAgainstSchema(obj[key], schema[key]);
        } else {
            assert(
                typeof obj[key] === schema[key],
                `Property "${key}" has incorrect type. Expected "${schema[key]}", but got "${typeof obj[key]}".`
            )
        }
   })

}
