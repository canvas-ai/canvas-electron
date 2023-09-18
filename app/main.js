/**
 * Canvas main()
 */

// Environment variables
const {
    app: APP,
    user: USER,
} = require('./env.js');

// Utils
const path = require('path');
const fs = require('fs');
const debug = require('debug')('canvas-main'); // TODO: Replace with logger
const JsonMap = require('./utils/JsonMap.js');
const Config = require('./utils/config')
const Log = require('./utils/logger')

// Core services
const db = require('./services/db/index.js')
const Index = require('./services/core/indexd/index.js')

// Manager classes
const AppManager = require('./managers/AppManager.js');
const ContextManager = require('./managers/ContextManager.js');
const PeerManager = require('./managers/PeerManager.js');
const RoleManager = require('./managers/RoleManager.js');
const ServiceManager = require('./managers/ServiceManager.js');
const UserManager = require('./managers/UserManager.js');


/**
 * Main application
 */

class Canvas {


    constructor(options = {
        sessionEnabled: true,
        sessionRestoreOnStart: true,
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

        this.serviceManager = new ServiceManager()
        this.roleManager = new RoleManager()
        this.appManager = new AppManager()
        this.userManager = new UserManager()
        this.contextManager = new ContextManager()
        this.peerManager = new PeerManager()


        /**
         * Initialize core services
         */

        this.db = this.serviceManager.initializeService('core/db', {

        })

        // Transports


        // Session
        // TODO: Extract to a separate session module
        this.session = (options.sessionEnabled) ?
            new JsonMap(path.join(USER.paths.home, 'session')) :
            false

        // Current
        //this.device = {}
        //this.user = {} // user.identities
        //this.context = {}

        // App State
        this.isInitialized = false
        this.isMaster = true
        this.status = 'stopped'

    }

    // Getters
    get apps() { return this.appManager.list(); }
    get roles() { return this.roleManager.list(); }
    get services() { return this.serviceManager.list(); }
    get identities() { return this.identitiesManager.list(); }
    get peers() { return this.peerManager.list(); }
    get contexts() { return this.contextManager.list(); }

    get user() { return this.userManager.user; }
    get device() { return this.userManager.device; }


    async start(context, options = {
        loadSavedSession: true, // If false, we'll start with an empty context
        loadUserServices: true,
        loadUserRoles: true,
        loadUserApps: true,
    }) {

        // TODO: Return an IPC/RPC connection instead
        if (this.isInitialized && this.isMaster) throw new Error('Application already running')

        // Fetch the context URL from the session
        let url = (this.session) ? this.session.get('url') : null

        // Event listeners
        await this.setupProcessEventListeners()

        // Services
        if (options.loadServices) await this.setupServices([ /*..*/ ])


        this.isInitialized = true
    }

    async restart() {}

    async status() {}

    async shutdown() {
        console.log('Shutting down Canvas');

        try {
            //await this.session.save();
            await this.shutdownApps();
            await this.shutdownRoles();
            await this.shutdownServices();

            console.log('Graceful shutdown completed successfully.');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

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


    /**
     * ServiceManager Facade
     */

    listServices(type) { return this.sm.listServices(type); }
    listUsers() { return this.um.listUsers(); }
    listPeers() { return this.pm.listPeers(); }
    listContexts() { return this.cm.listContexts(); }


    async setupServices(services = []) {
        services.forEach(async (service) => {
            await this.sm.loadService(service)
            await this.sm.initializeService(service, {
                context: this.context,
                index: this.index
            })
            await this.sm.startService(service)
        })
    }

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

    async shutdownServices() {
        return true
    }

    async shutdownRoles() {
        return true
    }

    async shutdownApps() {
        return true
    }

}

module.exports = Canvas
