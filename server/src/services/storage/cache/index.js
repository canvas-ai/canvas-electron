'use strict';


/**
 * Cache interface
 */

// Utils
const debug = require('debug')('canvas:stored:cache');

// Includes
const cacache = require('cacache');

// Default cache configuration
const DEFAULT_CONFIG = {
    algorithms: ['sha1'],
};

class Cache {

    #config;
    #cacheRoot;

    constructor(config) {
        debug('Initializing Canvas StoreD caching layer..');
        if (!config.rootPath || typeof config.rootPath !== 'string') {
            throw new Error('Cache rootPath not defined');
        }

        this.#config = {
            ...DEFAULT_CONFIG,
            ...config
        };

        this.#cacheRoot = config.rootPath;
        debug(`Canvas StoreD cache initialized, cache root at "${this.#cacheRoot}"`);
    }

    list() {
        return cacache.ls(this.#cacheRoot);
    }

    listAsStream() {
        return cacache.ls.stream(this.#cacheRoot);
    }

    has(key) {
        return cacache.get.info(this.#cacheRoot, key);
    }

    put(key, data, metadata = {}) {
        return cacache.put(this.#cacheRoot, key, data, {
            ...this.#config,
            metadata: metadata
        });
    }

    putAsStream(key, metadata = {}) {
        return cacache.put.stream(this.#cacheRoot, key, {
            ...this.#config,
            metadata: metadata
        });
    }

    get(key, metadataOnly = false) {
        return (metadataOnly) ? this.getMetadata(key) : cacache.get(this.#cacheRoot, key);
    }

    getMetadata(key) {
        return cacache.get.info(this.#cacheRoot, key);
        // This can introduce problems, but hey, we can handle it in stored
        // A better implementation would be to strip cacache metadata
        // const metadata = cacache.get.info(this.#cacheRoot, key);
        // if (!metadata.checksum) { metadata.checksums[defaultAlgo] = metadata.integrity; }
        // return metadata.metadata;
    }

    getAsStream(key) {
        return cacache.get.stream(this.#cacheRoot, key);
    }

    getInfo(key) {
        return cacache.get.info(this.#cacheRoot, key);
    }

    delete(key, destroy = true) {
        return cacache.rm.entry(this.#cacheRoot, key, { removeFully: destroy });
    }

    verify() { return cacache.verify(this.#cacheRoot); }
}

module.exports = Cache;
