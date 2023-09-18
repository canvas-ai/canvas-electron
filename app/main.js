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
const fs = require('fs');
const debug = require('debug')('canvas-main'); // TODO: Replace with logger
const JsonMap = require('./utils/JsonMap.js');
const Config = require('./utils/config')
const Log = require('./utils/logger')

// Core services
const Db = require('./services/db')
const Storage = require('./services/stored')

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
            userConfigDir: USER_CONFIG,
            appConfigDir: APP_CONFIG,
            versioning: false
        })

        this.logger = new Log({
            appName: pkg.name,
            logLevel: process.env.LOG_LEVEL || 'debug',
            logPath: path.join(USER_VAR, 'log')
        })


        /**
         * Initialize core backends
         */

        this.db = new Db({
            path: path.join(USER.paths.home, 'db'),
        })

        this.storage = new Storage({
            dataPath: USER.paths.data,
            cachePath: USER.paths.cache,
            metadataPath: this.db.createDataset('metadata'),
            cachePolicy: 'remote'
        })

        // TODO: Implement a new Map() for bitmaps
        // TODO: Implement a proper backend for Layers
        // TODO: Implement a proper SessionManager

        /**
         * Initialize the session manager
         */

        this.session = (options.sessionEnabled) ?
            new JsonMap(path.join(USER.paths.home, 'session')) :
            null

        // Static variables
        this.device = DEVICE
        this.app = APP

        this.services = null
        this.roles = null
        this.apps = null
        this.user = null    // user.identity / user.identities

        // App State
        this.isInitialized = false
        this.isMaster = true
        this.status = 'stopped'

        // Global context (focus)
        this.context = null

    }

    // Getters
    get apps() { return this.appManager.list(); }
    get roles() { return this.roleManager.list(); }
    get services() { return this.serviceManager.list(); }
    get identities() { return this.identitiesManager.list(); }
    get peers() { return this.peerManager.list(); }
    get contexts() { return this.contextManager.list(); }

    get user() { return this.user; }
    get device() { return this.device; }


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
        this.context = this.contextManager.createContext(url)

        // Setup context event listeners to update the session
        if (this.session) {
            context.on('url', (url) => {
                debug(`Context URL of context "${context.id}" changed, updating session`)
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
        debug('Shutting down Canvas');

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


    /**
     * Context manager
     */

    createContext(url) {
        if (!this.isInitialized) {
            throw new Error("Application must be initialized before creating a context.");
        }
        return this.contextManager.createContext(url);
    }

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
        debub('Stopping services');
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
