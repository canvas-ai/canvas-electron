'use strict';


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

// Core Services
const Db = require('./services/db')
//const StoreD = require('./services/stored')

// Engine
const Index = require('./engine/index')
const Context = require('./engine/context')
//const Synapse = require('./engine/synapse')

// Transport
const socketio = require('./services/socketio')
const restapi = require('./services/jsonapi')


/**
 * Main application
 */

class Canvas {

    constructor(options) {

        // TODO
        options = {
            logLevel: 'debug',
            transport: {
                socketio: {
                    enabled: true,
                    protocol: 'http'
                },
                restapi: {
                    enabled: true,
                    protocol: 'http'
                }
            },
            ...options
        }

        debug('Initializing canvas')
        // Initialize the config
        // TODO: Extract to a separate config module
        // Initialize logging
        // TODO: Extract to a separate logging module

        // Initialize the DB Backend
        this.db = new Db({
            path: path.join(user.db),
            maxDbs: 32
        })

        // Initialize Index
        this.index = new Index(this.db.createDataset('index'))

        // Initialize data store
        /*this.data = new StoreD({
            dataPath: user.data,
            cachePath: user.cache
        })*/

        // Session
        // TODO: Extract to a separate session module
        this.session = new JsonMap(path.join(user.home, 'session'))

        /*
        // Canvas Services
        this.services = new ServiceManager({
            path: path.join(user.config, 'services')
        })

        // Canvas Roles
        this.roles = new RoleManager({
            path: path.join(user.config, 'roles')
        })

        // Canvas Apps
        this.apps = new AppManager({
            path: path.join(user.config, 'apps')
        })

        */

        // Global Context (subject to change!)
        this.context = null        

        // App State
        this.isInitialized = false
        this.isMaster = true

    }

    async start(contextID = 0, options = {
        loadRoles: true,
        loadApps: true,
    }) {

        debug('Starting application services')

        // TODO: Return an IPC/RPC connection instead
        if (this.isInitialized && this.isMaster) throw new Error('Application already running')

        // Initialize global Context (subject to change!)
        this.context = this.createContext()

        // Core components
        await this.setupProcessEventListeners()

        // Services
        await this.setupServices()
    }

    getContext() { return this.context; }

    createContext(url = this.session.get('url')) {
        if (!url && this.context) {
            debug("Global context session already initialized, returning current context")
            return this.context
        }

        let context = new Context(url)
        context.on('url', (url) => {
            debug("Context URL changed, updating session")
            this.session.set('url', url)
        })

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

    async setupServices(context) {
        //await webdav.start(context)
        await socketio.start(this.context)
        await restapi.start(this.context, this.index)
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
