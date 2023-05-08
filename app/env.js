'use strict'


// Utils
const path = require('path')
const os = require('os')
const fs= require('fs')
const isElectron = require('is-electron')()
const pkg = require('./package.json')


// Most of the below code is not really needed, to-be-removed!
// App env
const APP_ROOT = path.dirname(path.resolve(__dirname))
const APP_CONFIG = path.join(APP_ROOT, 'config')
const APP_VAR = path.join(APP_ROOT, 'var')

// User env
const USER_HOME_PORTABLE = path.join(APP_ROOT, 'user')
const USER_HOME = getUserHome()
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
    config: APP_CONFIG,
    var: APP_VAR

}

const user = {
    // User directories
    home: USER_HOME,
    config: USER_CONFIG
}

const device = {}

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
    CANVAS_ROOT: APP_ROOT,
    CANVAS_CONFIG: APP_CONFIG,
    CANVAS_VAR: APP_VAR, // Is this really needed?

    // User
    CANVAS_USER_HOME: USER_HOME,
    CANVAS_USER_CONFIG: USER_CONFIG,

    // Export main IPC socket (server and client)
    CANVAS_SOCK_IPC: ipc

});

module.exports.test = 'test'


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
    isPortable: (USER_HOME === USER_HOME_PORTABLE),  // TODO: Rework

    utils: {
        checkObjectAgainstSchema
    },

    ipc

}


/**
 * Common utilities
 */

function getUserHome() {

    // If CANVAS_USER_HOME was supplied as a env parm, set it as such
    if (process.env.CANVAS_USER_HOME) return process.env.CANVAS_USER_HOME

    // If CANVAS_PORTABLE was set explicitly, return the app-default
    if (process.env.CANVAS_PORTABLE) return USER_HOME_PORTABLE

    // If no portable setup was defined, check if the portable data dir exists,
    // fallback to the local os home directory
    return (fs.existsSync(USER_HOME_PORTABLE)) ? USER_HOME_PORTABLE : path.join(os.homedir(), ".canvas")

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
