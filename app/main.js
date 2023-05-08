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

// Services
const Db = require('./services/db')
//const StoreD = require('./services/stored')
//const webdav = require('./services/webdavd')
const socketio = require('./services/socketio')
const restapi = require('./services/jsonapi')

// Core components
const Context = require('./engine/context')
const Index = require('./engine/index')


/**
 * Main app entry point
 */

class Canvas {


    constructor(options) {

        // TODO
        options = {
            ...options
        }

        debug('Initializing canvas')

        // DB Backend
        this.db = new Db({
            path: path.join(user.home, 'db'),
            maxDbs: 32
        })

        // Index
        this.index = new Index(this.db.createDataset('index'))

        // Disk-backed Maps, TODO: Extract to a separeate session module supporting the current db backend instead
        this.session = new JsonMap(path.join(user.home, 'session'))

        // Global Context (subject to change!)
        this.context = null

    }

    async start(services = true) {

        debug('Starting application services')
        // TODO: Return an IPC/RPC connection instead
        if (Canvas.isRunning()) throw new Error('Application already running')

        // Initialize global Context (subject to change!)
        this.context = this.createContext()

        // Core components
        await this.setupContextEventListeners()
        await this.setupProcessEventListeners()

        // Optional services
        if (services) await this.setupServices()
    }

    getContext() { return this.context; }

    createContext(url = this.session.get('url')) {
        if (!url && this.context) {
            debug("Default context session already initialized, returning current context")
            return this.context
        }

        if (this.context && this.context.url === url)  {
            debug("Context URL same as requested URL, returning current context")
            return this.context
        }

        let context = new Context(url, null, this.session)
        return context
    }

    removeContext(uuid) {}

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
