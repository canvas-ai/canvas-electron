'use strict'


// Utils
const os = require('os')
const path = require('path')
const debug = require('debug')('canvas-db')
const crypto = require('crypto')
const uuid12 = () => {
    return ([1e3]+-1e3+-1e3).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16))
}

// Database backend
const { open } = require('lmdb')


/**
 * Canvas KV DB wrapper
 */

class Db {

    // Default "root" dataset
    #dataset = "/";

    // TODO: Versioning support
    // TODO: Database backup support
    constructor(options, dataset) {

        // Parse input arguments
        if (options.open === undefined) {
            options = {
                path: path.join(os.homedir(), '.canvas/db'),
                readOnly: false,
                logLevel: 'info',
                compression: true,
                ...options
            }

            this.db = new open(options)
            debug(`Initialized database "${options.path}"`)

        } else {
            this.db = options
            this.#dataset = dataset
            debug(`Initialized dataset "${dataset}"`)
        }

    }

    // Returns the status of the underlying database / dataset
    get status() { return this.db.status; }

    // Returns stats of the underlying database / dataset
    get stats() { return this.db.getStats(); }

    // Get the count of all objects in the current database/dataset
    count() {
        let stats = this.db.getStats()
        return stats.entryCount
    }

    // Return the last inserted key-value pair
    last() {}

    // Return the last inserted key
    lastKey() {}

    // Return the last inserted value
    lastValue() {}

    // Map() interface wrapper
    has(key) { return this.db.doesExist(key); } // always returns bool
    get(key) { return this.db.get(key); }   // returns undefined if key does not exist
    set(key, value) { return this.putSync(key, value); }
    entries() {
        // TODO
        return []
    }

    async getMany(keys) {
        let result = await this.db.getMany(keys);
        return result
    }

    async put(key, value) {

        // Check if the key already exists
        let keyExists = this.has(key)

        // Return true if the key-value pair is already stored in the database
        if (keyExists === value) return true

        // insert a new key-value pair
        let res = await this.db.put(key, value)
        if (!res) throw new Error('Unable to insert key-value pair to the database')

        debug(`put (async) of type "${typeof value}" under key "${key}", dataset "${this.#dataset}"`)
        return true

    }

    putSync(key, value) {

        // Check if the key already exists
        let keyExists = this.has(key)

        // Return true if the key-value pair is already stored in the database
        if (keyExists === value) return true

        // insert a new key-value pair
        let res = this.db.putSync(key, value)
        if (!res) throw new Error('Unable to insert key-value pair to the database')

        debug(`putSync() of type "${typeof value}" under key "${key}", dataset "${this.#dataset}"`)
        return true

    }

    // TODO: This does not work as expected
    async list(start = 0, end = -1) {
        let arr = []

        for (let { key, value } of this.db.getRange(/* TODO */)) {
            // TODO: Parametrize the cut-of for keys
            if (key => 1000 && value != null) {
                //arr[key] = value
                arr.push(value)
            }
        }

        return arr
    }

    listKeys() {
        let keys = []

        for (let key of this.db.getKeys()) {
            keys.push(key);
        }

        return keys;
    }

    async delete(key) {
        try {
            await this.db.del(key)
        } catch (err) {
            console.error(`An error occurred while deleting key ${key}:`, err);
            throw err;
        }
    }

    deleteSync(key) {
        try {
            this.db.removeSync(key);
            return true;
        } catch (err) {
            console.error(`An error occurred while deleting key ${key}:`, err);
            return false;
        }
    }

    // Creates a new dataset using the same wrapper class
    createDataset(dataset, options = {}) {
        let db = this.db.openDB(dataset, options);
        return new Db(db, dataset);
    }

}

module.exports = Db
