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

// Core services
const Db = require('./services/db');
const NeuralD = require('./services/neurald');
const SynapsD = require('./services/synapsd');
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
            path: path.join(USER.paths.db),
            compression: false,
        })

        this.neurald = new NeuralD({
            db: this.db,
            config: this.config,
            logger: this.logger
        })

        this.synapsd = new SynapsD({
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

        // Canvas globals
        //this.services = new ServiceManager();
        //this.roles = new RoleManager();
        //this.apps = new AppManager();
        this.devices = new DeviceManager();
        //this.users = new UserManager();
        //this.identities = new IdentityManager()
        //this.peers = new PeerManager();
        //this.session = new SessionManager();

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
            treePath: path.join(USER.paths.home, 'tree.json'),
            layerPath: path.join(USER.paths.home, 'layers.json')
        })

        this.layers = Tree.layers;
        this.bitmaps = new Map();

        // Contexts
        this.activeContexts = new Map();

        // App State
        this.isInitialized = false
        this.isMaster = true
        this.status = 'stopped'

    }

    /**
     * Canvas service controls
     */

    async start() {

        // TODO: Return a IPC connection instead
        if (this.isInitialized && this.isMaster) throw new Error('Application already running')
        this.status = 'starting'

        this.setupProcessEventListeners()
        await this.initializeServices()
        await this.initializeTransports()
        await this.initializeRoles()
        await this.initializeApps()

        this.isInitialized = true
        this.status = 'running'

        this.emit('start')
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
        return context
    }

    removeContext(id) {
        let context = this.activeContexts.get(id)
        if (context) {
            context.destroy()
            this.activeContexts.delete(id)
        }
    }

    listContexts() {
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
