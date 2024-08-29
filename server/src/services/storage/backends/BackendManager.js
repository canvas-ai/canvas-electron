const path = require('path');
const fs = require('fs');

/* Example config
const options = {
    lmdb: {
        enabled: true,
        type: 'local',
        priority: 1,
        dataTypes: ['note', 'document'],
        driver: 'lmdb',
        driverConfig: {
            // LMDB specific config
        }
    },
    s3: {
        enabled: true,
        type: 'remote',
        priority: 1,
        dataTypes: ['file'],
        driver: 's3',
        driverConfig: {
            // S3 specific config
        }
    }
}; */

class BackendManager {

    constructor(rootPath, options = {}) {
        this.rootPath = rootPath ?? path.resolve(__dirname, 'backends/');
        this.config = options;
        this.backends = new Map();
        this.primaryBackends = new Map();

        this.#loadBackends();
        this.#setPrimaryBackends();
    }

    registerBackend(name, backend, dataTypes = []) {
        if (this.has(name)) {
            throw new Error(`Backend with name '${name}' already exists`);
        }
        this.backends.set(name, backend);

        for (const dataType of dataTypes) {
            if (!this.primaryBackends.has(dataType)) {
                this.primaryBackends.set(dataType, backend);
            }
        }
    }

    listBackend() {
        return Array.from(this.backends.keys());
    }

    getBackend(name) {
        if (!this.has(name)) {
            throw new Error(`Backend '${name}' not found`);
        }
        return this.backends.get(name);
    }

    getPrimaryBackend(dataType) {
        if (!this.primaryBackends.has(dataType)) {
            throw new Error(`No primary backend set for data type: ${dataType}`);
        }
        return this.primaryBackends.get(dataType);
    }

    hasBackend(name) {
        return this.backends.has(name);
    }

    close() {
        for (const backend of this.backends.values()) {
            if (typeof backend.close === 'function') {
                backend.close();
            }
        }
    }

    #loadBackends() {
        for (const [name, config] of Object.entries(this.config)) {
            if (!config.enabled) continue;

            const BackendClass = this.#loadBackendClass(config.driver);
            const backendInstance = new BackendClass(config.driverConfig);

            if (typeof backendInstance.initialize === 'function') {
                backendInstance.initialize();
            }

            this.backends.set(name, backendInstance);
        }
    }

    #loadBackendClass(driver) {
        const backendPath = path.join(this.rootPath, `${driver}.js`);
        try {
            return require(backendPath);
        } catch (error) {
            throw new Error(`Failed to load backend driver: ${driver}`);
        }
    }

    #setPrimaryBackends() {
        const dataTypes = new Set(Object.values(this.config).flatMap(config => config.dataTypes || []));

        for (const dataType of dataTypes) {
            const primaryBackend = this.#findPrimaryBackendForType(dataType);
            if (primaryBackend) {
                this.primaryBackends.set(dataType, primaryBackend);
            }
        }
    }

    #findPrimaryBackendForType(dataType) {
        const backendEntries = Object.entries(this.config)
            .filter(([_, config]) => config.enabled && (config.dataTypes || []).includes(dataType))
            .sort((a, b) => (a[1].priority || Infinity) - (b[1].priority || Infinity));

        if (backendEntries.length > 0) {
            return this.backends.get(backendEntries[0][0]);
        }

        return null;
    }
}

module.exports = BackendManager;