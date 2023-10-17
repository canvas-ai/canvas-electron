/**
 * Canvas main()
 */


// Environment variables
const {
    APP,
    USER,
    DEVICE
} = require('./env.js');

// Utils
const path = require('path');
const debug = require('debug')('canvas-main'); // TODO: Replace with logger
const Config = require('./utils/config')
const Log = require('./utils/logger')

// Core service backends
const Db = require('./services/db')
const StoreD = require('./services/stored')
const SynapsD = require('./services/synapsd')

// Manager classes
const AppManager = require('./managers/app');
const PeerManager = require('./managers/peer');
const RoleManager = require('./managers/role');
const ServiceManager = require('./managers/service');
const SessionManager = require('./managers/session');
const UserManager = require('./managers/user');
const IdentityManager = require('./managers/peer');

// Context
const ContextTree = require('./context/lib/Tree.js')
const Context = require('./context')


/**
 * Main application
 */

class Canvas {

    constructor(options = {
        sessionEnabled: true,
        enableUserApps: false,
        enableUserRoles: false
    }) {

        debug('Initializing Canvas')

        /**
         * Utils
         */

        this.config = Config({
            userConfigDir: USER.paths.config,
            appConfigDir: APP.paths.config,
            versioning: false
        })

        this.logger = new Log({
            appName: APP.name,
            logLevel: process.env.LOG_LEVEL || 'debug',
            logPath: path.join(USER.paths.var, 'log')
        })

        /**
         * Core services
         */

        this.db = new Db({
            path: path.join(USER.paths.db),
            compression: false,
        })

        this.synapsd = new SynapsD({
            db: this.db,
            config: this.config,
            logger: this.logger
        })

        this.storage = new StoreD({
            paths: {
                data: USER.paths.data,
                cache: USER.paths.cache,
            },
            cachePolicy: 'pull-through',
        })

        /**
         * App
         */

        // Canvas globals
        this.services = new ServiceManager()
        this.roles = new RoleManager()
        this.apps = new AppManager()
        //this.devices = new DeviceManager()
        //this.identities = new IdentityManager()

        // Context modules
        this.contexts = new Map()
        this.tree = new ContextTree({
            path: USER.paths.home
        })

        // Data
        this.documents = this.db.createDataset('documents')


        // TODO: Replace with session manager
        this.session = (options.sessionEnabled) ?
            this.db.createDataset('session') :
            null

        // Static variables
        this.device = DEVICE
        this.app = APP

        // App State
        this.isInitialized = false
        this.isMaster = true
        this.status = 'stopped'

    }

    /**
     * Canvas service controls
     */

    async start(contextUrl, options) {

        // TODO: Return a IPC/RPC connection instead
        if (this.isInitialized && this.isMaster) throw new Error('Application already running')
        this.setupProcessEventListeners()

        // Try to restore previous contexts from session
        let savedContexts = (this.session) ?
            this.session.get('contexts') : []

        // Temporary
        let url = contextUrl || this.session.get('url') || null
        let context = this.createContext(url, options)

        // Setup context event listeners to update the session
        if (this.session) {
            context.on('url', (url) => {
                debug(`Context URL of context "${this.context.id}" changed, updating session`)
                this.session.set('url', url)
            })
        }

        this.isInitialized = true
    }

    async restart() {
        debug('Restarting Canvas..');
        await this.shutdown(false)
        await this.start()
    }

    async shutdown(exit = true) {
        if (exit ) debug('Shutting down Canvas');

        try {
            //if (this.session) await this.session.save();
            await this.shutdownApps();
            await this.shutdownRoles();
            await this.shutdownServices();

            console.log('Graceful shutdown completed successfully.');
            if (exit) process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    status() { return this.status; }
    stats() { return []; }

    /**
     * Context
     */

    createContext(url, options = {}) {
        let context = new Context(url, this, options)
        this.contexts.set(context.id, context)
        return context
    }

    removeContext(id) {
        let context = this.contexts.get(id)
        if (context) {
            context.destroy()
            this.contexts.delete(id)
        }
    }

    listContexts() {
        return this.contexts.values()
    }


    /**
     * Process
     */

    setupProcessEventListeners() {

        process.on('uncaughtException', (error) => {
            console.error(error);
            this.shutdown().then(() => process.exit(1));
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('warning', (warning) => {
            console.warn(warning.name);
            console.warn(warning.message);
            console.warn(warning.stack);
        });

        process.on('SIGINT', async (signal) => {
            console.log(`Received ${signal}, gracefully shutting down`);
            await this.shutdown();
            process.exit(0);
        });

        process.on('SIGTERM', async (signal) => {
            console.log(`Received ${signal}, gracefully shutting down`);
            await this.shutdown();
            process.exit(0);
        });

        process.on('beforeExit', async (code) => {
            if (code !== 0) return;
            debug('Process beforeExit: ', code);
            await this.shutdown();
        });

        process.on('exit', (code) => {
            debug(`Bye: ${code}`);
        });
    }

}

module.exports = Canvas
