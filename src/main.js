/**
 * Canvas
 */

// Utils
const path = require('path');
const debug = require('debug')('canvas-main');
const EventEmitter = require('eventemitter2');
const Config = require('./utils/config/index.js');
const winston = require('winston');

// Services
const Db = require('./services/db');    // We can use a single lmdb instance for both, index and as the storage lmdb backend
const Jim = require('./services/jim');
const Index = require('./services/index');
const Storage = require('./services/storage');

// Manager classes
const AppManager = require('./managers/app');
const ContextManager = require('./managers/context/index.js');
const DeviceManager = require('./managers/device');
const PeerManager = require('./managers/peer');
const RoleManager = require('./managers/role');
const ServiceManager = require('./managers/service');
const SessionManager = require('./managers/session');
const UserManager = require('./managers/user');

// Transports
const TransportHttp = require('./io/http');

// App constants
const MAX_SESSIONS = 32;
const MAX_CONTEXTS_PER_SESSION = 32;
const APP_STATUSES = [
    'initialized',
    'starting',
    'running',
    'stopping',
    'stopped',
];


/**
 * Main application
 */

class Canvas extends EventEmitter {

    #mode;
    #device = {};
    #server = {};
    #user = {};
    #status = 'stopped'; // stopped, initialized, starting, running, stopping;

    constructor(options = {}) {
        debug('Initializing Canvas Server');

        /**
         * Lets do some basic options validation
         */

        if (!options.mode) {
            throw new Error('Canvas Server mode not specified');
        }

        if (!options.paths.server ||
            !options.paths.server.config ||
            !options.paths.server.data ||
            !options.paths.server.ext ||
            !options.paths.server.var) {
            throw new Error('Canvas Server paths not specified');
        }

        if (options.mode === 'full' &&
            !options.paths.user ||
            !options.paths.user.config ||
            !options.paths.user.index ||
            !options.paths.user.db ||
            !options.paths.user.cache ||
            !options.paths.user.data ||
            !options.paths.user.workspaces) {
            throw new Error('Canvas Server user paths not specified');
        }

        /**
         * Utils
         */

        super(); // EventEmitter2

        // App info
        this.app = options.app;
        this.#mode = options.mode;
        this.#server.paths = options.paths.server;
        this.#user.paths = options.paths.user;
        this.#device = DeviceManager.getCurrentDevice();

        // Global config module
        this.config = Config({
            serverConfigDir: this.#server.paths.config,
            userConfigDir: this.#user.paths.config,
            configPriority: (this.#mode === 'full') ? 'user' : 'server',
            versioning: false,
        });

        // Global Logger
        let logFile = path.join(this.#server.paths.var, 'canvas-server.log');
        debug('Server log file: ', logFile);
        this.logger = winston.createLogger({
            level: process.env['LOG_LEVEL'] || 'info',
            format: winston.format.simple(),
            transports: [
                new winston.transports.File({ filename: logFile }),
                // TODO: Add a debug-based transport
            ],
        });

        /**
         * Runtime environment
         */

        this.PID = process.env['pid'];          // Current App instance PID
        this.IPC = process.env['ipc'];          // Shared IPC socket
        this.transports = new Map();            // Transport instances

        // Bling-bling for the literature lovers
        this.logger.info(`Starting ${this.app.name} v${this.app.version}`);
        this.logger.info(`Server mode: ${this.#mode}`);
        debug('Server paths:', this.#server.paths);
        debug('User paths:', this.#user.paths);

        /**
         * Canvas Server RoleManager (minimal mode)
         */

        this.roleManager = new RoleManager({
            rolesPath: this.#server.paths.roles,
        });

        // TODO: Initialize transports for the minimal mode || refactor
        if (this.#mode !== 'full') {
            this.logger.info('Canvas Server initialized in minimal mode');
            this.#status = 'initialized';
            return;
        }

        /**
         * Canvas services
         */

        // Canvas indexing service
        this.index = new Index({
            rootPath: this.#user.paths.index,
            backupPath: path.join(this.#user.paths.index, 'backup'),
            backupOnOpen: true,
            backupOnClose: false,
            compression: true,
        });

        // Canvas data/storage service
        this.storage = new Storage({
            cache: {
                enabled: true,
                maxAge: -1,
                rootPath: this.#user.paths.cache,
                cachePolicy: 'pull-through',
            },
            backends: {
                file: {
                    enabled: true,
                    priority: 1,
                    type: 'local',
                    backend: 'file',
                    backendConfig: {
                        path: this.#user.paths.data,
                    }
                },
                db: {
                    enabled: true,
                    primary: true,
                    type: 'local',
                    backend: 'lmdb',
                    backendConfig: {
                        path: this.#user.paths.db,
                        backupOnOpen: true,
                        backupOnClose: false,
                        compression: true,
                    },
                },
            },
        });

        /**
         * Managers
         */

        this.deviceManager = new DeviceManager({
            index: this.index.createIndex('devices', 'file'),
        });

        this.contextManager = new ContextManager({
            index: this.index,
            storage: this.storage,
            // TODO: Replace with config.get('context')
            maxContexts: MAX_SESSIONS * MAX_CONTEXTS_PER_SESSION,
        });

        this.sessionManager = new SessionManager({
            sessionStore: this.index.createDataset('session'),
            contextManager: this.contextManager,
            // TODO: Replace with config.get('session')
            maxSessions: MAX_SESSIONS,
            maxContextsPerSession: MAX_CONTEXTS_PER_SESSION,
        });

        this.logger.info('Canvas Server initialized');
        this.#status = 'initialized';
    }

    // Getters
    get appName() { return this.app.name; }
    get version() { return this.app.version; }
    get description() { return this.app.description; }
    get license() { return this.app.license; }
    get paths() {
        return {
            server: this.#server.paths,
            user: this.#user.paths,
        };
    }
    get mode() { return this.#mode; }
    get currentDevice() { return this.#device; }
    get pid() { return this.PID; }
    get ipc() { return this.IPC; }

    /**
     * Canvas service controls
     */

    async start() {
        if (this.#status === 'running') { throw new Error('Canvas Server already running'); }

        // Initialize the universe
        this.contextManager.initUniverse({
            device: this.#device,

        })
        // Inject the system context (for remote instances, this has to be provided by the client!)

        // Indexes
        // Storage
        // Load system context
        // Load user context

        this.#status = 'starting';
        this.emit('starting');

        try {
            this.setupProcessEventListeners();
            await this.roleManager.start();
            await this.initializeTransports();

            if (this.#mode === 'full') {
                this.sessionManager.createSession('default');
                await this.initializeServices();
                await this.initializeRoles();
            }
        } catch (error) {
            this.logger.error('Error during Canvas Server startup:', error);
            process.exit(1);
        }

        this.#status = 'running';
        this.emit('running');
        this.logger.info('Canvas Server started successfully');
        return true;
    }

    async stop(exit = true) {
        debug(exit ? 'Shutting down Canvas Server...' : 'Shutting down Canvas Server for restart');
        this.logger.info(exit ? 'Shutting down Canvas Server...' : 'Shutting down Canvas Server for restart');

        this.emit('before-shutdown');
        this.#status = 'stopping';
        try {
            await this.sessionManager.saveSessions();
            await this.shutdownRoles();
            await this.shutdownTransports();
            await this.shutdownServices();
            this.logger.info('Graceful shutdown completed successfully.');
            if (exit) { process.exit(0); }
        } catch (error) {
            this.logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    async restart() {
        debug('Restarting Canvas Server');
        this.logger.info('Restarting Canvas Server');
        this.emit('restart');
        await this.stop(false);
        await this.start();
    }

    async status() {
        return {
            status: this.#status,
            pid: this.PID,
            ipc: this.IPC,
            device: this.#device,
            mode: this.#mode,
            server: {
                appName: this.app.name,
                version: this.app.version,
                description: this.app.description,
                license: this.app.license,
            },
            sessions: this.listActiveSessions(),
        };
    }


    /**
     * Session
     */

    listActiveSessions() { return this.sessionManager.listActiveSessions(); }

    async listSessions() {
        let sessions = await this.sessionManager.listSessions();
        return sessions;
    }

    getSession(id) {
        return this.sessionManager.getSession(id);
    }

    createSession(id, sessionOptions = {}) {
        return this.sessionManager.createSession(id, sessionOptions);
    }

    openSession(id) {
        return this.sessionManager.openSession(id);
    }

    closeSession(id) {
        return this.sessionManager.closeSession(id);
    }

    deleteSession(id) {
        return this.sessionManager.deleteSession(id);
    }


    /**
     * Services
     */

    async initializeServices() {
        debug('Initializing services');
        return true;
    }

    async shutdownServices() {
        debug('Shutting down services');
        await this.db.stop();
        return true;
    }


    /**
     * Transports
     */

    // TODO: Refactor / remove
    async initializeTransports() {
        debug('Initializing transports');
        // Load configuration options for transports
        let config = this.config.open('server');
        const transportsConfig = config.get('transports');

        // This is a (temporary) placeholder implementation
        const httpTransport = new TransportHttp({
            protocol: config.get('transports.rest.protocol'),
            host: config.get('transports.rest.host'),
            port: config.get('transports.rest.port'),
            auth: config.get('transports.rest.auth'),
            canvas: this,
            db: this.db,
            contextManager: this.contextManager,
            sessionManager: this.sessionManager,
        });

        try {
            await httpTransport.start();
        } catch (error) {
            console.log(`Error initializing http transport:`, error);
            process.exit(1);
        }

        this.transports.set('http', httpTransport);

        /*
        const transports = [
            { name: 'http', class: TransportHttp },
            { name: 'rest', class: TransportRest },
            { name: 'socketio', class: TransportSocketIO }
        ];

        // TODO: The whole thing has to be refactored
        for (let transport of transports) {
            this.transports[transport.name] = new transport.class({
                host: config.get(`${transport.name}.host`),
                port: config.get(`${transport.name}.port`),
                auth: config.get(`${transport.name}.auth`),
                canvas: this,
                db: this.db,
                contextManager: this.contextManager,
                sessionManager: this.sessionManager,
            });

            try {
                await this.transports[transport.name].start();
            } catch (error) {
                console.log(`Error initializing ${transport.name} transport:`, error);
                process.exit(1);
            }
        }*/

        return true;
    }

    async shutdownTransports() {
        debug('Shutting down transports');

        for (let [name, transport] of this.transports) {
            try {
                await transport.stop();
            } catch (error) {
                console.log(`Error shutting down ${name} transport:`, error);
            }
        }
        return true;
    }


    /**
     * Roles
     */

    async initializeRoles() {
        return true;
    }

    async shutdownRoles() {
        return true;
    }

    /**
     * Storage
     */

    async insertDocument(doc, backendArray, contextArray = [], featureArray = []) {
                /*
        let validatedDocument = await this.??.validateDocument(doc); // returns a proper document object with schema based on doc.type
        let documentMeta = await this.storage.insertDocument(validatedDocument, backendArray); // will extract features?

        documentMeta = {
            id: '1234567890abcdef',
            type: 'note',
            checksums: {
                md5: '1234567890abcdef',
                sha1: '1234567890abcdef1234567890abcdef',
                sha256: '1234567890abcdef1234567890abcdef',
            },
            paths: [
                'canvas://local:lmdb/note/sha1-1234567890abcdef1234567890abcdef',
                'canvas://local:file/notes/20241201.a2va23o4iqaa.json',
                'canvas://office:s3/notes/20241201.a2va23o4iqaa.json',
            ],
            features: {
                mime: 'application/json',
            }
            size: 12345,
            created: 1634867200
        }
        */
        return this.index.insertObject(documentMeta, contextArray, featureArray);

    }

    updateDocument(doc, contextArray = [], featureArray = []) {
        return this.storage.updateDocument(doc, contextArray, featureArray);
    }

    removeDocument(doc, contextArray = [], featureArray = []) { }

    deleteDocument(doc, contextArray = [], featureArray = []) {
        return this.storage.deleteDocument(doc, contextArray, featureArray);
    }

    /**
     * Process Event Listeners
     */

    setupProcessEventListeners() {

        process.on('uncaughtException', (error) => {
            console.error(error);
            this.stop().then(() => process.exit(1));
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
            await this.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async (signal) => {
            console.log(`Received ${signal}, gracefully shutting down`);
            await this.stop();
            process.exit(0);
        });

        process.on('beforeExit', async (code) => {
            if (code !== 0) {return;}
            debug('Process beforeExit: ', code);
            await this.stop();
        });

        process.on('exit', (code) => {
            console.log(`Bye: ${code}`);
        });
    }

}

module.exports = Canvas;
