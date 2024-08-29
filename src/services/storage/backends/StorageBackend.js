// Common interface for all storage backends
// Should finally switch to TypeScript!


class StorageBackend {

    constructor(config) {
        if (new.target === StorageBackend) {
            throw new TypeError("Cannot construct StorageBackend instances directly");
        }

        // type: 'local' | 'remote'
        // driver: 's3' | 'gcs' | 'azure' | 'local.file' | 'local.memory'
        // priority: INT
        // cacheEnabled: BOOLEAN
        // name
        // description
        this.name = config.name;
        this.description = config.description;
        this.type = config.type;
        this.driver = config.driver;
        this.driverConfig = config.driverConfig;
        this._status = 'initialized';
    }

    async putFile(key, filePath, metadata) {
        throw new Error('putAsFile method must be implemented');
    }

    async putDocument(key, data, metadata) {
        throw new Error('putAsObject method must be implemented');
    }

    async putBinary(key, data, metadata) {
        throw new Error('putAsBinary method must be implemented');
    }

    // TODO: Add stream support

    async getFile(key, options = {}) {
        throw new Error('getFile method must be implemented');
    }

    async getDocument(key, options = {}) {
        throw new Error('getDocument method must be implemented');
    }

    async getBinary(key, options = {}) {
        throw new Error('getBinary method must be implemented');
    }

    async getStream(key, options = {}) {
        throw new Error('getBinary method must be implemented');
    }

    /**
     * Common methods
     */

    async has(key) {
        throw new Error('has method must be implemented');
    }

    async list(options = {}) {
        throw new Error('list method must be implemented');
    }

    async delete(key) {
        throw new Error('delete method must be implemented');
    }

    async stat(key) {
        throw new Error('stat method must be implemented');
    }

    /**
     * Utils
     */

    get config() {
        return {
            name: this.name,
            description: this.description,
            type: this.type,
            driver: this.driver,
            driverConfig: this.driverConfig
        };
    }

    get status() {
        return this._status;
    }

}

module.exports = StorageBackend;
