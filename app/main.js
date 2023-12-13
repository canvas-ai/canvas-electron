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

// Constants
const MAX_CONTEXTS = 1024 // 2^10
const MAX_FEATURES = 65536 // 2^16
const MAX_FILTERS = 65536 // 2^16

// Core services
const Db = require('./services/db');
const IndexD = require('./services/indexd');
const NeuralD = require('./services/neurald');
const StoreD = require('./services/stored');

// Manager classes
const AppManager = require('./managers/app');
const PeerManager = require('./managers/peer');
const RoleManager = require('./managers/role');
const ServiceManager = require('./managers/service');
const SessionManager = require('./managers/session');
const UserManager = require('./managers/user');
const IdentityManager = require('./managers/peer');
const DeviceManager = require('./managers/device');

// Context
const Tree = require('./context/lib/Tree');
const Context = require('./context');


/**
 * Main application
 */

class Canvas extends EventEmitter {

    constructor(options = {
        sessionEnabled: true,
        restoreSession: true,
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

        this.db = new Db({
            path: USER.paths.db,
            backupPath: path.join(USER.paths.db, 'backup'),
            backupOnOpen: true,
            backupOnClose: false,
            compression: false,
        })

        this.index = new IndexD({
            db: this.db,
            config: this.config,
            logger: this.logger
        })

        this.neurald = new NeuralD({
            db: this.db,
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

        this.session = new SessionManager({
            dbPath: path.join(USER.paths.db, 'session.json')
        }); */

        // TODO: Replace with session manager
        this.session = (options.sessionEnabled) ?
            this.db.createDataset('session') :
            null

        // Static variables
        this.app = APP
        this.user = USER
        this.device = DEVICE
        this.PID = PID
        this.IPC = IPC

        // Global objects shared with all contexts
        this.tree = new Tree({
            treePath: path.join(USER.paths.db, 'tree.json'),
            layerPath: path.join(USER.paths.db, 'layers.json')
        })

        this.layers = this.tree.layers;
        this.bitmaps = new Map();

        // Contexts
        this.activeContexts = new Map();
        this.focusedContext = null;

        // App State
        this.isMaster = true
        this.status = 'stopped'

    }

    // Getters
    static get version() { return APP.version; }
    static get paths() { return APP.paths; }
    get apps() { return this.apps; }
    get pid() { return this.PID; }
    get ipc() { return this.IPC; }
    get context() { return this.focusedContext; }

    /**
     * Canvas service controls
     */

    async start(url, options = {}) {

        if (this.status == 'running' && this.isMaster) throw new Error('Application already running')
        this.status = 'starting'
        this.emit('starting')

        this.setupProcessEventListeners()
        await this.initializeServices()

        this.createContext(url, options)
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
            //if (this.session) await this.session.save();
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
            context: this.focusedContext,
            index: this.index
        })

        await this.services.loadInitializeAndStartService('websocket', {
            context: this.focusedContext,
            index: this.index
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
     * Context
     */

    createContext(url, options = {}) {
        let context = new Context(url, this, options)
        this.activeContexts.set(context.id, context)
        if (this.focusedContext == null) this.focusedContext = context
        return context
    }

    switchContext(id) {
        let context = this.activeContexts.get(id)
        if (!context) return false

        this.focusedContext = context
        this.emit('context-switched', context)
        return context
    }

    removeContext(id) {
        if (this.status != 'running') throw new Error('Application not running')

        let context = this.activeContexts.get(id)
        if (context) {
            context.destroy()
            this.activeContexts.delete(id)
        }
    }

    listContexts() {
        if (this.status != 'running') throw new Error('Application not running')
        return this.activeContexts.values()
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
