'use strict'


// Utils
const path = require('path')
const os = require('os')
const Cache = require('./cache')

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


    constructor(options) {

        options = {
            dataPath: path.join(os.homedir(), '.stored/data'),
            cachePath: path.join(os.homedir(), '.stored/cache'),
            metadataPath: path.join(os.homedir(), '.stored/metadata'),
            autoRegisterAbstractions: true,
            autoRegisterBackends: true,
            cachePolicy: 'remote', // all, remote, none
            ...options
        }

        this.dataPath = options.dataPath
        this.metadataPath = options.metadataPath
        this.cachePath = options.cachePath

        // If a db is passed in, use it, otherwise create a new one
        // TODO: instanceof would be nicer
        this.metadata = (options.metadataPath.open !== undefined) ?
            options.metadataPath : new Db({
                    path: options.metadataPath
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
