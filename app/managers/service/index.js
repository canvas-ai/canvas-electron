'use strict'


/**
 * Canvas Service manager
 *
 * TODO: This module should use fork() and some common IPC mechanism
 * to communicate with services(not node-ipc, maybe a custom one
 * or zeromq). To not get caught up in some custom node net-ipc
 * endeavor(again), I'll load all services in-process for now.
 */

// Environment
const { APP, USER, DEVICE } = require('../../env.js')

// Utils
const EventEmitter = require("eventemitter2");
const path = require("path");
const fs = require('fs');
const debug = require("debug")("canvas:service-manager")

// Default options
const defaultOptions = {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
};

/**
 * Service Manager
 */

class ServiceManager extends EventEmitter {

    constructor(options = {
        rootPath: path.join(APP.paths.home, 'services')
    }) {

        debug('Initializing Canvas Service Manager')
        super();

        this.root = options.rootPath;

        this.loadedServices = new Map();
        this.initializedServices = new Map();

    }

    listServices() {
        return {
            'loaded': this.listLoadedServices(),
            'initialized': this.listInitializedServices(),
            'running': this.listRunningServices()
        }
    }

    listLoadedServices() { return Array.from(this.loadedServices.keys()); }

    listInitializedServices() { return Array.from(this.initializedServices.keys()); }

    listRunningServices() {
        let running = [];
        for (let [name, service] of this.initializedServices) {
            if (service.isRunning()) running.push(name);
        }
        return running;
    }

    loadService(name) {

        // If the service is already loaded, don't load it again
        if (this.loadedServices.has(name)) {
            debug(`[loadService] Service '${name}' is already loaded`);
            return;
        }

        try {
            let servicePath = path.join(this.root, name)
            if (!fs.existsSync(servicePath)) throw new Error(`Service ${name} not found at path "${servicePath}"`)
            // Implement subfolder search for services/core
            const LoadedService = require(servicePath);
            this.loadedServices.set(name, LoadedService);
        } catch (err) {
            throw new Error(`[loadService] Failed to load service '${name}': ${err}`);
        }
    }

    unloadService(name) {

        // If the service is initialized, it cannot be unloaded
        if (this.initializedServices.has(name)) {
            throw new Error(`Service '${name}' is initialized, cannot unload the module`);
        }

        // Service is not loaded, nothing to do
        if (!this.loadedServices.has(name)) {
            debug(`[unloadService] Service '${name}' is not loaded, nothing to do`);
            return;
        }

        try {
            const modulePath = require.resolve(path.join(this.root, name));
            this.loadedServices.delete(name);
            delete require.cache[modulePath];
        } catch (err) {
            console.error(`[unloadService] Failed to unload service '${name}': ${err}`);
        }
    }

    initializeService(name, options = {}) {

        // If the service is already initialized, don't initialize it again
        if (this.initializedServices.has(name)) {
            debug(`[initializeService] Service '${name}' is already initialized`);
            return;
        }

        try {
            const Service = this.loadedServices.get(name);
            if (!Service) {
              throw new Error(`Service '${name}' has not been loaded`);
            }

            const serviceInstance = new Service(options);
            console.log(serviceInstance)
            //this.loadedServices.delete(name);
            this.initializedServices.set(name, serviceInstance);
            return serviceInstance;
        } catch (err) {
            console.error(`[initializeService] Failed to initialize service '${name}': ${err}`);
        }
    }

    async startService(name) {
        debug(`[startService] Starting service '${name}'`)
        const service = this.initializedServices.get(name);
        if (!service) {
            throw new Error(`Service '${name}' has not been initialized`);
        }
        service.start();
    }

    async shutdownService(name) {
        debug(`[shutdownService] Shutting down service '${name}'`)
        const service = this.initializedServices.get(name);
        if (!service) {
            debug(`[shutdownService] Service '${name}' is not running, nothing to do`);
            return false;
        }
        await service.shutdown();
        this.services.delete(name);
    }

    async stopService(name) {
        debug(`[stopService] Stopping service '${name}'`)
        const service = this.initializedServices.get(name);
        if (!service || !service.isRunning) {
            debug(`[stopService] Service '${name}' is not initialized or running, nothing to do`);
            return false;
        }
        await service.stop();
        this.initializedServices.delete(name);
    }

    async restartService(name) {
        debug(`[restartService] Restarting service '${name}'`)
        await this.shutdownService(name);
        await this.startService(name);
    }

    async shutdownAllServices() {
        debug(`[shutdownAllServices] Shutting down all services`)
        const shutdownPromises = Array.from(this.initializedServices.keys()).map(name => this.shutdownService(name));
        await Promise.all(shutdownPromises);
    }

    async stopAllServices() {
        debug(`[stopAllServices] Stopping all services`)
        const stopPromises = Array.from(this.initializedServices.keys()).map(name => this.stopService(name));
        await Promise.all(stopPromises);
    }

    async reloadServiceFromDisk(name, ...options) {
        debug(`[reloadServiceFromDisk] Reloading service '${name}'`)
        await this.stopService(name);  // Stop the service
        this.unloadService(name);  // Unload the service
        this.loadService(name);  // Load the service
        this.initializeService(name, options);  // Initialize the service
        this.startService(name);  // Start the service
    }

    async loadInitializeAndStartService(name, ...options) {
        debug(`[loadInitializeAndStartService] Loading, initializing and starting service '${name}'`)
        this.loadService(name);
        this.initializeService(name, options);
        await this.startService(name);
    }
}

module.exports = ServiceManager;
