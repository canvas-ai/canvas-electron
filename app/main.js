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
const Storage = require('./services/stored')

// Core services
const Index = require('./services/indexd')
const Neural = require('./services/neurald')

// Manager classes
const AppManager = require('./managers/app');
const ContextManager = require('./managers/context');
const PeerManager = require('./managers/peer');
const RoleManager = require('./managers/role');
const ServiceManager = require('./managers/service');
const UserManager = require('./managers/user');


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
         * Initialize services
         */

        this.db = new Db({
            path: path.join(USER.paths.home, 'db'),
        })

        this.storage = new Storage({
            paths: {
                data: USER.paths.data,
                cache: USER.paths.cache,
            },
            cachePolicy: 'pull-through',
            // TODO: Add cache TTL support
            // TODO: Rework
            db: this.db.createDataset('storage'),
            // TODO: Rework too :)
            config: this.config,
            logger: this.logger
        })

        this.index = new Index({
            db: this.db.createDataset('index'),
            config: this.config,
            logger: this.logger
        })


        // TODO: Implement a new Map() for bitmaps
        // TODO: Implement a proper backend for Layers
        // TODO: Implement a proper SessionManager

        this.contextManager = new ContextManager()


        /**
         * Initialize the session manager
         */

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

        // Global context (focus)
        this.context = null

        // NN Connector (vLLM+vector store)
        this.neural = new Neural({
            db: this.db.createDataset('neural'),
            storage: this.storage,
            index: this.index,
            context: this.context
        })

    }

    async start(contextUrl, options) {

        // TODO: Return a IPC/RPC connection instead
        if (this.isInitialized && this.isMaster) throw new Error('Application already running')
        this.setupProcessEventListeners()

        // Initialize Services
        this.services = {}

        // Initialize Roles
        this.roles = {}

        // Initialize Apps
        this.apps = {}

        // Initialize the user class
        this.user = {}

        // Try to restore previous contexts from session
        let savedContexts = (this.session) ?
            this.session.get('contexts') : []

        // Oook lets implement a single url-based global context for now
        // till a proper SessionManager is ready
        let url = contextUrl || this.session.get('url') || null
        this.context = this.contextManager.createContext(url, options)

        // Setup context event listeners to update the session
        if (this.session) {
            this.context.on('url', (url) => {
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
     * Context manager
     */

    createContext(url) {
        if (!this.isInitialized) {
            throw new Error("Application must be initialized before creating a context.");
        }
        return this.contextManager.createContext(url);
    }

    getCurrentContext() { return this.context; }


    /**
     * AppManager Facade
     */

    listApps(type) {}
    registerApp() {}
    unregisterApp() {}
    startApp() {}
    stopApp() {}
    shutdownApps() {
        debug('Stopping apps');
    }


    /**
     * RoleManager Facade
     */

    listRoles(type) { return this.rm.listRoles(type); }
    registerRole() {}
    unregisterRole() {}
    startRole() {}
    stopRole() {}
    restartRole() {}
    getRoleStatus() {}
    shutdownRoles() {
        debug('Stopping roles');
    }


    /**
     * ServiceManager Facade
     */

    listServices(type) { return this.sm.listServices(type); }
    shutdownServices() {
        debug('Stopping services');
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
