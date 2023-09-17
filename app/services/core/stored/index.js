'use strict'


// Utils
const path = require('path')
const os = require('os')
const Cache = require('./cache')

// Includes
const Db = require('../../db')



// TODO: Generate dynamically based on the ./abstractions folder
const STORAGE_ABSTRACTIONS = [

];

// TODO: Generate dynamically based on the ./backends folder
const STORAGE_BACKENDS = [
    'lmdb'
];


/**
 * Canvas Stored
 */

class Stored {


    constructor(options, db = null) {

        options = {
            dataPath: path.join(os.homedir(), '.stored/data'),
            cachePath: path.join(os.homedir(), '.stored/cache'),
            metadataBackend: 'lmdb',
            metadataPath: path.join(os.homedir(), '.stored/metadata'),
            autoRegisterAbstractions: true,
            autoRegisterBackends: true,
            cachePolicy: 'remote', // all, remote, none
            ...options
        }

        this.metadata = (db) ? db : new Db({
            path: options.metadataPath
        })

        this.cache = (options.cachePolicy != 'none') ? new Cache(this.#cachePath) : false;
        this.dataBackends = {}

    }

    put(meta, data, backend = [], options ={}) {}
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

    registerBackend() {}
    listBackends() {}
    getBackend() {}
    unregisterBackend() {}

}

module.exports = Stored
