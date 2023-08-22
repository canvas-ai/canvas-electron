/**
 * Canvas App manager
 */

// Environment
const { app, user, transport, isElectron } = require('../env.js')

// Utils
const EventEmitter = require("eventemitter2");
const path = require("path");
const debug = require("debug")("canvas:app-manager")

// Default options
const defaultOptions = {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
};

/**
 * App manager
 */

class AppManager extends EventEmitter {

    constructor(params = {
        rootPath: path.join(app.home, 'apps')
    }) {

        debug('Initializing Canvas App Manager')
        super();

        this.root = params.rootPath;

        this.loadedApps = new Map();
        this.initializedApps = new Map();

    }

}

module.exports = AppManager;
