'use strict'

/**
 * Cache interface
 */

// Utils
const log = console.log

// Lib
const cacache = require('cacache')
const _merge = require('lodash/merge')

// Default cache/cached configuration
const defConfig = {
    algorithms: ['sha1']
}

class Cache {

    constructor(cacheRoot, options) {

        if (!cacheRoot) { throw new Error('Cache path not set, program will exit') }

        log(`Cache constructor; cache root @${cacheRoot}`)
        this.cacheRoot = cacheRoot

    }

    list() {
        return cacache.ls(this.cacheRoot)
    }

    listAsStream() {
        return cacache.ls.stream(this.cacheRoot)
    }

    has(key) {
        return cacache.get.info(this.cacheRoot, key)
    }

    hasByKey(key) {
        return cacache.get.info(this.cacheRoot, key)
    }

    hasByHash(hash) {
        return cacache.get.hasContent(this.cacheRoot, hash)
    }

    put(key, data, opts) {
        return cacache.put(this.cacheRoot, key, data, _merge(defConfig, opts))
    }

    putAsStream(key, opts) {
        return cacache.put.stream(this.cacheRoot, key, _merge(defConfig, opts))
    }

    get(key) {
        return cacache.get(this.cacheRoot, key)
    }

    getByKey(key) {
        return cacache.get(this.cacheRoot, key)
    }

    getByHash(hash) {
        return cacache.get.stream.byDigest(this.cacheRoot, hash)
    }

    getAsStreamByKey(key) {
        return cacache.get.stream(this.cacheRoot, key)
    }

    getAsStreamByHash(hash) {
        return cache.get.byDigest(this.cacheRoot, hash)
    }

    getInfo(key) {
        return cacache.get.info(this.cacheRoot, key)
    }

    delByKey(key) {
        return cacache.rm.entry(this.cacheRoot, key)
    }

    delByHash(hash) {
        return cacache.rm.content(this.cacheRoot, hash)
    }

}

module.exports = Cache
