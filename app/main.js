/**
 * Canvas main()
 */

// Environment variables
const {
    APP,
    USER,
    DEVICE,
    PID,
    IPC
} = require('./env.js');

// Utils
const path = require('path');
const debug = require('debug')('canvas-main'); // TODO: Replace with logger
const Config = require('./utils/config');
const Log = require('./utils/logger');
const EventEmitter = require('eventemitter2');
const { log } = require('console');

// Core services
const SynapsDB = require('./services/synapsdb');
const NeuralD = require('./services/neurald');
const StoreD = require('./services/stored');

// Manager classes
const ServiceManager = require('./managers/service');
const ContextManager = require('./managers/context');
//const AppManager = require('./managers/app');
//const PeerManager = require('./managers/peer');
//const RoleManager = require('./managers/role');
//const SessionManager = require('./managers/session');
//const UserManager = require('./managers/user');
//const IdentityManager = require('./managers/peer');
//const DeviceManager = require('./managers/device');

// Transports
//const RestTransport = require('./transports/rest');
//const SocketioTransport = require('./transports/socketio');


/**
 * Main application
 */

class Canvas extends EventEmitter {

    constructor(options = {
        sessionEnabled: true,
        initGlobalContext: true,
        enableUserApps: false,
        enableUserRoles: false
    }) {

        debug('Initializing Canvas');


        /**
         * Utils
         */

        super() // EventEmitter2

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

        this.db = new SynapsDB({
            path: USER.paths.db,
            backupPath: path.join(USER.paths.db, 'backup'),
            backupOnOpen: true,
            backupOnClose: false,
            compression: true
        })

        this.neurald = new NeuralD({
            db: this.db.createDataset('neurald'),
            config: this.config,
            logger: this.logger
        })

        this.stored = new StoreD({
            paths: {
                data: USER.paths.data,
                cache: USER.paths.cache,
            },
            cachePolicy: 'pull-through',
        })


        /**
         * Managers
         */

        this.services = new ServiceManager({
            config: path.join(USER.paths.config, 'services.json'),
            serviceDirs: [
                path.join(APP.paths.home, 'services'),
                path.join(APP.paths.home, 'transports')
            ]
        });

        /* this.session = new SessionManager({
            dbPath: path.join(USER.paths.db, 'session.json')
        }); */

        // TODO: Replace with session manager
        this.session = (options.sessionEnabled) ?
            this.db.createDataset('session') :
            null        

        this.contexts = new ContextManager({
            db: this.db
        })

        /*
        this.roles = new RoleManager({
            config: path.join(USER.paths.config, 'roles.json')
        });

        this.apps = new AppManager({
            config: path.join(USER.paths.config, 'apps.json')
        });

        this.devices = new DeviceManager({
            config: path.join(USER.paths.config, 'devices.json')
        });

        this.users = new UserManager({
            dbPath: path.join(USER.paths.db, 'users.json')
        });

        this.identities = new IdentityManager({
            dbPath: path.join(USER.paths.config, 'identities.json')
        });

        this.peers = new PeerManager({
            dbPath: path.join(USER.paths.db, 'peers.json')
        });
        */

        // Static variables
        this.APP = APP          // App runtime env
        this.USER = USER        // Current OS user
        this.DEVICE = DEVICE    // Current OS device
        this.PID = PID          // Current App instance PID
        this.IPC = IPC          // Shared IPC socket

        // App State
        this.isMaster = true
        this.status = 'stopped'
    }

    // Getters
    static get version() { return APP.version; }
    static get paths() { return APP.paths; }
    get appInfo() { return this.APP; }
    get userInfo() { return this.USER; }
    get deviceInfo() { return this.DEVICE; }
    get pid() { return this.PID; }
    get ipc() { return this.IPC; }


    /**
     * Canvas service controls
     */

    async start(url, options = {}) {
        if (this.status == 'running' && this.isMaster) throw new Error('Application already running')

        this.status = 'starting'
        this.emit('starting')

        this.setupProcessEventListeners()
        await this.initializeServices()

        // TODO: Load session
        if (!url) { url = (this.session) ?  this.session.get('contextUrl') : '/' }

        // Create context (TODO: Multi-context support)
        this.context = this.createContext(url, options);

        await this.initializeTransports()
        await this.initializeRoles()
        await this.initializeApps()

        this.status = 'running'
        this.emit('running')
    }

    async shutdown(exit = true) {
        if (exit) debug('Shutting down Canvas');
        this.emit('before-shutdown')
        this.status = 'stopping'

        try {
            // TODO: Save session
            //if (this.session) await this.session.save();
            if (this.session) await this.session.put('contextUrl', this.context.url)
            //await this.shutdownApps();
            await this.shutdownRoles();
            await this.shutdownTransports();
            await this.shutdownServices();
            console.log('Graceful shutdown completed successfully.');
            if (exit) process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    async restart() {
        debug('Restarting Canvas..');
        this.emit('restart')
        await this.shutdown(false)
        await this.start()
    }

    status() { return this.status; }
    stats() { return []; }


    /**
     * Contexts
     */

    createContext(url = '/', options = {}) {
        let context = this.contexts.createContext(url, options)
        return context
    }

    removeContext(id) { return this.contexts.removeContext(id); }

    listContexts() { return this.contexts.listContexts(); }

    lockContext(id, url) { return this.contexts.lockContext(url); }

    unlockContext(id) { return this.contexts.unlockContext(id); }
    

    /**
     * Services
     */

    async initializeServices() {
        return true
    }

    async shutdownServices() {
        return true
    }


    /**
     * Transports
     */

    async initializeTransports() {
        // for (const transport of this.config.transports) { /* load, then init, then start, catch err */ })
        await this.services.loadInitializeAndStartService('rest', {
            // TODO: Rework/refactor, are you serious!?
            context: this.context,
            db: this.db,
            canvas: this
        })

        await this.services.loadInitializeAndStartService('socketio', {
            context: this.context,
            db: this.db,
            canvas: this
        })

        return true
    }

    async shutdownTransports() {
        return true
    }


    /**
     * Roles
     */

    async initializeRoles() {
        return true
    }

    async shutdownRoles() {
        return true
    }


    /**
     * Apps
     */

    async initializeApps() {
        return true
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
            console.log(`Bye: ${code}`);
        });
    }

}

module.exports = Canvas
