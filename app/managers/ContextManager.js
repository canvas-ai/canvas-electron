/**
 * Canvas Context manager
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
 * Context Manager
 */

class ContextManager extends EventEmitter {

    constructor(params = {
        rootPath: path.join(app.home, 'apps')
    }) {

        debug('Initializing Context Manager')
        super();

        this.root = params.rootPath;
        this.bitmapCache = new Map()
    }

    createContext(url) {}

    removeContext(url) {}

    listContexts() {}

    getCurrentContext() { return this.context; }

    createContext(url) {

        let context = new Context(url)

        // Setup an event listener for session update if
        // session support is enabled, to be moved to a separate method
        if (this.session) {
            context.on('url', (url) => {
                debug("Context URL changed, updating session")
                this.session.set('url', url)
            })
        }

        return context
    }

    removeContext(id) {}

}

module.exports = ContextManager;
