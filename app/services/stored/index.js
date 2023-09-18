'use strict'


// Utils
const path = require('path')
const os = require('os')
const Cache = require('./cache')
const debug = require('debug')('canvas-stored')


// Includes
const Db = require('../db')
const Document = {
    id: '',
    meta: {
        dataType: 'json' //
    },
    data: {

    }
}


// TODO: Generate dynamically based on the ./abstractions folder
const STORAGE_ABSTRACTIONS = [
    'file',
    'note',
    'tab',
    'todo'
];

// TODO: Generate dynamically based on the ./backends folder
const STORAGE_BACKENDS = [
    'fs',
    'fs-json',
    's3',
    'lmdb'
];


/**
 * Canvas Stored
 */

class Stored {


    constructor(options, kvstore) {

        debug('Initializing Canvas StoreD')
        options = {
            dataPath: path.join(os.homedir(), '.stored/data'),
            cachePath: path.join(os.homedir(), '.stored/cache'),
            autoRegisterAbstractions: true,
            autoRegisterBackends: true,
            cachePolicy: 'remote', // all, remote, none
            ...options
        }

        this.dataPath = options.dataPath
        this.cachePath = options.cachePath

        this.metadata = (kvstore) ?
            kvstore : new Db({
                    path: path.join(this.dataPath, 'db')
                })

        this.cache = (options.cachePolicy != 'none') ?
            new Cache(this.cachePath) : false;

        this.dataAbstractions = []
        this.dataBackends = []

    }

    //put(meta, data, backend = [], options ={}) {
    put(document, backend , options ={}) {}

    putAsStream() {}

    get() {}
    getMeta(id) {
        return []
    }

    stat() {}
    statByID() {}
    statByHash() {}
    statByUrl() {}

    getByID() {}

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