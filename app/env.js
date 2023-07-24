'use strict'


// Utils
const path = require('path')
const fs = require('fs')
const os = require('os')
const isElectron = require('is-electron')()
const pkg = require('./package.json')
const device = require('./utils/device')

// App env
const APP_ROOT = path.dirname(path.resolve(__dirname))
const APP_HOME = path.join(APP_ROOT, 'app')
const APP_CONFIG = path.join(APP_ROOT, 'config')
const APP_VAR = path.join(APP_ROOT, 'var')

// User env
const USER_HOME = getUserHome()
const USER_DB = path.join(USER_HOME, 'db')
const USER_INDEX = path.join(USER_HOME, 'index')
const USER_DATA = path.join(USER_HOME, 'data')
const USER_CACHE = path.join(USER_HOME, 'cache')
const USER_CONFIG = path.join(USER_HOME, 'config')


/**
 * Runtime configuration
 */

const app = {
    // App package info
    name: (pkg.productName) ? pkg.productName : pkg.name,
    version: pkg.version,
    description: pkg.description,
    license: pkg.license,

    // App directories
    root: APP_ROOT,
    home: APP_HOME,
    config: APP_CONFIG,
    var: APP_VAR
}

const user = {
    // User directories
    cache: USER_CACHE,
    config: USER_CONFIG,
    data: USER_DATA,
    db: USER_DB,
    home: USER_HOME,
    index: USER_INDEX
}


// TODO: Move to config
const ipc = (process.platform === 'win32') ?
        path.join('\\\\?\\pipe', process.cwd(), pkg.name) :
        path.join(app.var, 'run', `${pkg.name}-ipc.sock`)


/**
 * Process environment setup
 */

// Update process env vars
Object.assign(process.env, {

    // Developer settings
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

    // App
    // Is this really needed?
    CANVAS_APP_ROOT: APP_ROOT,
    CANVAS_APP_CONFIG: APP_CONFIG,
    CANVAS_APP_VAR: APP_VAR,

    // User
    CANVAS_USER_HOME: USER_HOME,
    CANVAS_USER_CONFIG: USER_CONFIG,
    CANVAS_USER_DB: USER_DB,
    CANVAS_USER_INDEX: USER_INDEX,
    CANVAS_USER_DATA: USER_DATA,

    // Export main IPC socket (server and client)
    CANVAS_SOCK_IPC: ipc

});

module.exports = {
    app,
    user,
    device,

    // TODO: Remove, this is a very old remnant/more of a reminder for myself
    constants: {
        phi: 1.61803398, // (1 + Math.sqrt(5)) / 2; just a reminder
        din476: 0.70710678, // (1/sqrt(2))
    },

    runtime: (isElectron) ? 'electron' : 'node',

    // TODO: Initialize config and logger here
    utils: {
        // config: config,
        // logger: logger,
        checkObjectAgainstSchema
    },

    // TODO: Create a transport module instead
    ipc
}


/**
 * Common utilities
 */

// Default use-case is portable mode
// TODO: Rework, ugly
function getUserHome() {

    // CANVAS_USER_HOME was supplied explicitly
    if (process.env.CANVAS_USER_HOME) return process.env.CANVAS_USER_HOME

    // CANVAS_PORTABLE was set explicitly, return the portable user dir
    if (process.env.CANVAS_PORTABLE) return path.join(APP_ROOT, 'user')

    // No portable setup was defined, portable mode is disabled
    if (!fs.existsSync(path.join(APP_ROOT, 'user', '.ignore'))) return path.join(APP_ROOT, 'user')

    // Fallback to the local os home directory
    return path.join(os.homedir(), ".canvas")

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
