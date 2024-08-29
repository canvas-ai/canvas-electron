'use strict';

// Utils
const EE = require('eventemitter2');
const debug = require('debug')('canvas:stored');

// Data ingestion utils
const {
    isJson,
    isFile,
    isBuffer,
    isBinary,
} = require('./utils/common');
const {
    checksumJson,
    checksumBuffer,
    checksumFile,
    checksumFileArray,
} = require('./utils/checksums');

const embeddings = require('./utils/embeddings');
const fileinfo = require('./utils/fileinfo');

// StoreD caching layer
const Cache = require('./cache');

// StoreD backends
const BackendManager = require('./backends/BackendManager');


/**
 * StoreD
 *
 * GET operations will by default try local cache, then cycle through the backends in the order submitted
 * in the backend array, returning the first successful operation(optionally populating the cache).
 *
 * Insert operations will first try to store an object in a backend of type: local, honoring the backend cache
 * configuration for write operations. If no local backend is provided, we'll default to cache(if enabled),
 * then send the internal cache url to a syncd queue read by a sync worker.
 *
 * @class Stored
 * @param {Object} config - StoreD configuration object
 */

class Stored extends EE {

    constructor(config = {}, index) {
        debug('Initializing Canvas StoreD');
        if (!config) { throw new Error('No configuration provided'); }
        if (!config.cache) { throw new Error('No configuration object provided at options.config.cache'); }
        if (!config.backends) { throw new Error('No configuration object provided at options.config'); }

        // Initialize event emitter
        super(config.eventEmitter || {});

        // Initialize utils
        this.config = config;
        this.logger = config.logger || console; // will break, fixme
        this.utils = {
            isJson,
            isFile,
            isBuffer,
            isBinary,
            checksumJson,
            checksumBuffer,
            checksumFile,
            checksumFileArray,
        };

        // Global index
        if (!index) { throw new Error('Index module not provided'); }
        this.index = index;

        // Initialize global cache
        this.cache = new Cache(this.config.cache);

        // Initialize backends
        // Naming convention is not very flexible but should be enough for now
        // canvas://{instance}:{backend}/{type}/{identifier}
        // canvas://local:lmdb/checksum/sha1/hash
        // canvas://deviceid:lmdb/id/1234
        // canvas://office:s3/file/path/to/object
        // canvas://remote:api/blob/12345
        // canvas://deviceid:fs/path/to/indexed/file
        this.backendManager = new BackendManager(config.backends);

        // Initialize data ingestion pipeline
        // TODO
    }

    /**
     * Main interface
     */

    /**
     * Inserts a document into the storage backend(s).
     * @param {Object} document - The document to insert.
     * @param {string|string[]} backends - Name or array of backend names.
     * @param {Object} options - Additional options for the insertion.
     * @returns {Promise} - Result of inserting the document as a URL.
     */
    async insertDocument(document, backends = this.backends, options = {}) {
        // Validate document
        if (!document) { throw new Error('Document is required'); }
        if (!document.schema) { throw new Error('Document schema is required'); }

        const Schema = this.schemas.getSchema(document.schema);
        if (!Schema) { throw new Error(`Schema not found: ${document.schema}`); }
        if (!Schema.validate(document)) { throw new Error('Document validation failed'); };

        // Validate backends
        if (!backends || !Array.isArray(backends)) { throw new Error('Backends must be an array'); }
        for (const backendName of backends) {
            if (!this.backendManager.hasBackend()) { throw new Error(`Backend not found: ${backendName}`); }
        }

        // Initialize our document(handy)
        const doc = new Schema(document);

        // Calculate checksums
        let data = doc.generateChecksumData();
        let algorithms = doc.getChecksumAlgorithms();
        for (let i = 0; i < algorithms.length; i++) {
            let checksum = this.utils.checksumJson(data, algorithms[i]);
            doc.addChecksum(algorithms[i], checksum);
        }

        // Generate embeddings
        // TODO
        //data = doc.generateEmbeddingData();
        //let embeddings = this.utils.generateEmbeddings(data);
        doc.embeddings = []

        // Generate ID


        // Insert into storage
        doc.paths = await this.storage.insertDocument(doc, backends);



        // Validate basic document schema (we do not care about the actual schema here)
        // Maybe we should..?
        if (!this.#validateDocument(document)) { throw new Error('Schema validation failed', document); }

        // We will use a sync queue => store documents in local backend first
        // then sync to all selected backends but for now, we'll look through
        // all backends instead(file, lmdb, both should be fast enough)
        let resourceUrls = []; // URLs of the stored document in each backend
        for (const backendName of backends) {
            const backend = this.getBackend(backendName);
            try {
                // Insert the document into the backend
                const url = await backend.putDocument(document.id, document);
                resourceUrls.push(url);
            } catch (error) {
                throw new Error(`Failed to insert document to backend ${backendName}: ${error.message}`);
            }
        }

        return resourceUrls;
    }

    /**
     * Inserts a file into the storage backend(s) by file path.
     * @param {string} filePath - The file path to insert.
     * @param {Object} metadata - Optional metadata associated with the file.
     * @param {string|string[]} backends - Name or array of backend names.
     * @param {Object} options - Additional options for the insertion.
     * @returns {Promise} - Result of inserting the file as a URL.
     */
    async insertFile(filePath, metadata, backends = this.backends, options = {
        // copy, move, index
    }) {
        if (!filePath) { throw new Error('No file path provided'); }
        if (typeof backends === 'string') { backends = [backends]; }
        return this.insertUrl(filePath, metadata, backends, options);
    }

    /**
     * Inserts binary data (blob) into the storage backend(s).
     * @param {Buffer|ArrayBuffer} data - The binary data to insert.
     * @param {Object} metadata - Optional metadata associated with the blob.
     * @param {string|string[]} backends - Name or array of backend names.
     * @param {Object} options - Additional options for the insertion.
     */
    async insertBlob(data, metadata = {}, backends = this.backends, options = {}) {
        if (typeof backends === 'string') { backends = [backends]; }
        // Implementation here
    }

    async getFile(hash, backends = this.backends, options = {
        // Return as a stream
        // stream: false
        // Return as a direct file path
        // filePath: false
    }) {
        if (!hash) { throw new Error('No hash provided'); }
        if (typeof backends === 'string') { backends = [backends]; }
        const backendNames = Array.isArray(backends) ? backends : [backends];
        if (backendNames.length === 0) {
            throw new Error('No backend specified');
        }
    }

    async getDocument(id, backends = this.backends, options = {}) {
        if (!id) { throw new Error('No ID provided'); }
        if (typeof backends === 'string') { backends = [backends]; }

        const backendNames = Array.isArray(backends) ? backends : [backends];
        if (backendNames.length === 0) {
            throw new Error('No backend specified');
        }

        for (const backendName of backendNames) {
            const backend = this.getBackend(backendName);
            try {
                // Lets return the first successful result
                return await backend.getDocument(id);
            } catch (error) {
                debug(`Error getting document from backend ${backendName}: ${error.message}`);
                if (!this.config.backends[backendName].ignoreBackendErrors) {
                    continue;
                } else {
                    throw error;
                }
            }
        }
    }

    // Returns binary data(blob) as a Buffer
    async getBLob(hash, backends = this.backends, options = {}) {
        if (!hash) { throw new Error('No hash provided'); }
        if (typeof backends === 'string') { backends = [backends]; }

        if (backends.length === 0) {
            throw new Error('No backend specified');
        }
    }

    async has(id, backends = this.backends, options = {}) {
        if (!id) { throw new Error('No id provided'); }
        if (typeof backends === 'string') { backends = [backends]; }

        for (const backendName of backends) {
            const backend = this.getBackend(backendName);

            if (this.config.backends[backendName].localCacheEnabled) {
                try {
                    const cacheInfo = await this.cache.has(id);
                    if (cacheInfo) {
                        debug(`Cache hit for ID ${id} in backend ${backendName}`);
                        return true;
                    } else {
                        debug(`Cache miss for ID ${id} in backend ${backendName}`);
                        // Log miss and update cache if found?
                    }
                } catch (error) {
                    debug(`Cache error for ID ${id} in backend ${backendName}: ${error.message}`);
                }
            }

            try {
                const exists = await backend.has(hash);
                if (exists) { return true; }
            } catch (error) {
                debug(`Error checking object existence in backend ${backendName}: ${error.message}`);
                if (this.config.backends[backendName].ignoreBackendErrors) {
                    continue;
                } else {
                    throw error;
                }
            }
        }

        return false;
    }

    async stat(id, backends = this.backends) {
        if (typeof backends === 'string') { backends = [backends]; }

        for (const backendName of backends) {
            const backend = this.getBackend(backendName);
            try {
                return await backend.stat(id);
            } catch (error) {
                debug(`Error getting stats for object in backend ${backendName}: ${error.message}`);
                if (!this.config.backends[backendName].ignoreBackendErrors) {
                    continue;
                } else {
                    throw error;
                }
            }
        }

        throw new Error(`Object ID ${id} not found on any backend`);
    }

    async delete(hash, backends) {
        if (!hash) { throw new Error('No hash provided'); }
        if (typeof backends === 'string') { backends = [backends]; }
        const results = [];

        for (const backendName of backends) {
            const backend = this.getBackend(backendName);
            try {
                const result = await backend.delete(hash);
                results.push({ backend: backendName, result });

                if (this.config.backends[backendName].localCacheEnabled) {
                    await this.cache.delete(hash);
                }
            } catch (error) {
                debug(`Error deleting object from backend ${backendName}: ${error.message}`);
                if (!this.config.backends[backendName].ignoreBackendErrors) {
                    continue;
                } else {
                    throw error;
                }
            }
        }

        return results;
    }


    /**
     * Utils
     */

    #validateDocument(document) {
        // Base
        if (!document) { throw new Error('Document is not defined'); }
        if (!document.id) { throw new Error('Document ID is not defined'); }

        // Schema
        if (!Number.isInteger(document.id)) { throw new Error('Document ID must be an integer'); }
        if (!document.schema) { throw new Error('Document schema is not defined'); }

        // Timestamps
        if (!document.created_at) { throw new Error('Document created_at is not defined'); }
        if (!document.updated_at) { throw new Error('Document updated_at is not defined'); }

        // Checksums
        if (!document.checksums) { throw new Error('Document checksums are not defined'); }

        // Metadata
        if (!document.metadata) { throw new Error('Document metadata is not defined'); }
        this.#validateDocumentMetadata(document.metadata);

        return true;
    }

    #validateDocumentMetadata(metadata) {
        if (!metadata) { throw new Error('Metadata is not defined'); }
        if (!metadata.dataContentType) { throw new Error('Metadata dataContentType is not defined'); }
        if (!metadata.dataContentEncoding) { throw new Error('Metadata dataContentEncoding is not defined'); }
        return true;
    }
}

module.exports = Stored;
