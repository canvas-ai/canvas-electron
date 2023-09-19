'use strict'


// Utils
const path = require('path')
const os = require('os')
const Cache = require('./cache')
const debug = require('debug')('canvas-stored')

// Includes
const Db = require('../db')

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


    constructor(options) {

        debug('Initializing Canvas StoreD')
        options = {
            paths: {
                data: path.join(os.homedir(), '.stored/data'),
                cache: path.join(os.homedir(), '.stored/cache')
            },
            autoRegisterAbstractions: true,
            autoRegisterBackends: true,
            cachePolicy: 'remote', // all, remote, none
            ...options
        }

        this.dataPath = options.paths.data
        this.cachePath = options.paths.cache

        this.metadata = (options.db) ?
            options.db : new Db({
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
