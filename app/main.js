'use strict';


// Environment variables
const {
    app,
    user,
    transport,
    isElectron
} = require('./env.js')


// Utils
const path = require('path')
const debug = require('debug')('canvas-main')
const JsonMap = require('./utils/JsonMap')
//const Config = require('./utils/config')
//const Log = require('./utils/log')

// Manager classes
// Not really necessary currently, but will be useful later
// when we move to a multi-process architecture
const ServiceManager = require('./managers/ServiceManager')
const RoleManager = require('./managers/RoleManager')
const AppManager = require('./managers/AppManager')

// Transports
//const SocketIO = require('./transports/socketio')
//const RestAPI = require('./transports/restapi')

// Core services
const Db = require('./services/core/db')
const Index = require('./services/core/indexd')
const StoreD = require('./services/core/stored')

// Engine
const Context = require('./engine');


/**
 * Main application
 */

class Canvas {

    constructor(options = {
        enableSession: true
    }) {

        debug('Initializing Canvas')

        /**
         * Core Utils
         */

        // Initialize the global config module
        // TODO: Extract to a separate config module
        // Initialize logging
        // TODO: Extract to a separate logging module

        /**
         * Core services
         */

        // Initialize the DB Backend
        this.db = new Db({
            path: path.join(user.db),
            maxDbs: 32
        })

        // Initialize Index
        this.index = new Index(this.db.createDataset('index'))

        // Initialize data store
        this.data = new StoreD({
            dataPath: user.data,
            cachePath: user.cache
        })

        /**
         * Service Managers
         */

        // Initialize Service Manager
        this.sm = new ServiceManager({
            rootPath: path.join(app.home, 'services')
        })

        // Initialize Role Manager
        this.rm = new RoleManager({
            rootPath: path.join(app.home, 'roles')
        })

        // Initialize App Manager
        this.am = new AppManager({
            rootPath: path.join(app.home, 'apps')
        })


        // Session
        // TODO: Extract to a separate session module
        this.session = (options.enableSession) ?
            new JsonMap(path.join(user.home, 'session')) :
            false

        // Global Context (subject to change!)
        this.context = null

        // App State
        this.isInitialized = false
        this.isMaster = true

    }

    async start(contextId = 0, options = {
        loadServices: true,
        loadRoles: false,
        loadApps: false,
    }) {

        debug('Starting Canvas application services')

        // TODO: Return an IPC/RPC connection instead
        if (this.isInitialized && this.isMaster) throw new Error('Application already running')

        // Fetch the context URL from the session
        let url = (this.session) ? this.session.get('url') : null

        // Initialize global Context (subject to change!)
        this.context = this.createContext(url)

        // Event listeners
        await this.setupProcessEventListeners()

        // Services
        if (options.loadServices) await this.setupServices([
            'restapi',
            'socketio'
        ])

        // Roles
        // Apps
    }

    getContext() { return this.context; }

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

    async shutdown() {
        //await this.#session.save()
        await this.#shutdownApps()
        await this.#shutdownRoles()
        await this.#shutdownServices()
        process.exit(0)
    }

    async setupTransports() {}

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

    async setupIpcEventListeners() {
        //ipcServer.on('eventFoo', (data) => this.#handleIpcEvent('eventFoo', data))
        //ipcServer.on('eventBar', (data) => this.#handleIpcEvent('eventBar', data))
        //ipcServer.on('eventBaz', (data) => this.#handleIpcEvent('eventBaz', data))
    }

    async setupContextEventListeners() {}

    async setupProcessEventListeners() {

        // TODO
		process.on('uncaughtException', error => console.error(error))
		process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('warning', (warning) => {
            console.warn(warning.name);    // Print the warning name
            console.warn(warning.message); // Print the warning message
            console.warn(warning.stack);   // Print the stack trace
        });

        process.on('SIGINT', async (signal) => {
            console.log(`Received ${signal}, gracefully shutting down`)
            await this.shutdown()
        });

        process.on('SIGTERM', async (signal) => {
            console.log(`Received ${signal}, gracefully shutting down`)
            await this.shutdown()
        });

        process.on('beforeExit', async (code) => {
            debug('Process beforeExit event with code: ', code);
            await this.#shutdownApps()
            await this.#shutdownRoles()
            await this.#shutdownServices()
        });

        process.on('exit', (code) => {
            debug(`About to exit with code: ${code}`);
        });

    }

    registerServices() {
        // Loop through config services with status enabled
        // Check if svc exists
        // check if method register exists
        // register -> start
    }

    async #shutdownApps() {
        return true
    }

    async #shutdownRoles() {
        return true
    }

    async #shutdownServices() {
        return true
    }

    static isRunning() {
        return false
    }

}

module.exports = Canvas
