// Utils
const path = require('path');
const debug = require('debug')('canvas:stored:backend:lmdb');

// Includes
const StorageBackend = require('../StorageBackend');
const Db = require('../../../db')


/**
 * LMDB Backend
 */

class LmdbBackend extends StorageBackend {

    #db;

    constructor(backendOptions = {}) {
        debug('Initializing StoreD LMDB backend..');
        console.log('backendOptions', backendOptions);
        super({
            name: 'lmdb',
            description: 'Canvas StoreD LMDB Backend',
            type: 'local',
            driver: 'lmdb',
            driverConfig: backendOptions,
        });

        // Initialize database backend
        if (backendOptions.db && backendOptions.db instanceof Db) {
            this.#db = backendOptions.db; // Use provided database instance
        } else {
            if (!backendOptions.path) { throw new Error('Database path required'); }
            this.#db = new Db({
                backupOnOpen: false,
                backupOnClose: false,
                compression: true,
                ...backendOptions,
            });
        }
    }

    /**
     * Document methods
     */

    async putDocument(key, data, metadata = null) {
        debug(`Putting document key ${key} to LMDB backend..`);
        if (!key) { throw new Error('Document key is required'); }
        if (!data) { throw new Error('Document data is required'); }
        if (metadata || !data.metadata) { throw new Error('Metadata need to be stored in the supplied JSON document'); }
        return this.#db.put(key, data);
    }

    async getDocument(key, options = {}) {
        debug(`Getting document key ${key} from LMDB backend..`);
        if (!key) { throw new Error('Document key is required'); }
        if (Array.isArray(key)) { return this.getDocumentArray(key, options); }
        return this.#db.get(key);
    }

    async getDocumentArray(keys, options = {}) {
        debug(`Getting documents keys ${keys} from LMDB backend..`);
        if (!keys || !Array.isArray(keys)) { throw new Error('Document keys are required'); }
        return this.#db.getMany(keys);
    }

    /**
     * Common methods
     */

    async has(key) {
        return this.#db.has(key);
    }

    async list(options = {}) {
        return this.#db.listKeys(options);
    }

    async delete(key) {
        return this.#db.delete(key);
    }

    async stat(key) {
        let doc = await this.#db.get(key);
        if (doc) {
            return {
                size: JSON.stringify(doc).length,
                created_at: doc.created_at,
                updated_at: doc.updated_at
            };
        }
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
}

module.exports = LmdbBackend;
