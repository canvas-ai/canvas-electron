'use strict'


// Utils
const path = require('path')
const os = require('os')
const Cache = require('./cache')


/**
 * Canvas StoreD
 */

class Storage {

    #dataPath = null;
    #cachePath = null;

    constructor(options) {

        options = {
            dataPath: path.join(os.homedir(), '.canvas/data'),
            cachePath: path.join(os.homedir(), '.canvas/cache'),
            autoRegisterAbstractions: true,
            autoRegisterBackends: true,
            cachePolicy: 'remote', // all, remote, none
            ...options
        }

        this.#dataPath = options.dataPath
        this.#cachePath = options.cachePath

        this.cache = (options.cachePolicy != 'none') ? new Cache(this.#cachePath) : false;

        // TODO: Replace with a propper logger
        console.log(options)

    }

    put(path, backends) {}
    putAsStream() {}

    get() {}
    getMeta(id) {
        return []
    }

    stat() {}
    statByID() {}
    statByHash() {}
    statByUrl() {}

    getByID(oid) {}

    getByHash() {}
    getByUrl() {}

    getAsStream() {}
    getAsStreamByID() {}
    getAsStreamByHash() {}
    getAsStreamByUrl() {}

    update() {}
    updateByID() {}
    updateByHash() {}
    updateByUrl() {}

    delete() {}
    deleteByID() {}
    deleteByHash() {}
    deleteByUrl() {}

    list(backend) {}
    listAsStream() {}

    has() {}
    hasByID() {}
    hasByHash() {}
    hasByUrl() {}

    copyToBackend() {}
    moveToBackend() {}

    diff() {}

    listSyncStreams() {}
    startSyncStream() {}
    stopSyncStream() {}


}

module.exports = Storage
