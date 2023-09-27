'use strict'


// Utils
const os = require('os')
const path = require('path')
const debug = require('debug')('canvas-db')

// Database backend
const { open } = require('lmdb')


/**
 * Canvas DB wrapper
 * Uses LMDB, originally LevelDB
 */

class Db {


    // Default "root" dataset
    #dataset = "/";

    // TODO: Versioning support
    constructor(options, dataset) {

        // Parse input arguments
        if (options.open === undefined) {
            options = {
                path: options.path || path.join(os.homedir(), '.canvas/db'),
                readOnly: options.readOnly || false,
                logLevel: options.logLevel || 'info',
                compression: options.compression || true,
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

    /**
     * Custom methods
     */

    // Returns the status of the underlying database / dataset
    get status() { return this.db.status; }

    // Returns stats of the underlying database / dataset
    get stats() { return this.db.getStats(); }

    // Return the last inserted key-value pair
    last() {
        /* TODO */
        throw new Error("Not implemented");
    }

    // Return the last inserted key
    lastKey() {
        /* TODO */
        throw new Error("Not implemented");
    }

    // Return the last inserted value
    lastValue() {
        /* TODO */
        throw new Error("Not implemented");
    }

    // Creates a new dataset using the same wrapper class
    createDataset(dataset, options = {}) {
        let db = this.db.openDB(dataset, options);
        return new Db(db, dataset);
    }


    /**
     * Map() like (sync) interface
     */

    clear() { return this.db.clearSync(); }

    delete(key) { return this.db.removeSync(key); }

    entries() { /* TODO */ throw new Error("Not implemented"); }

    forEach() { /* TODO */ throw new Error("Not implemented"); }

    // get(key) { return this.db.get(key); }   // Using native LMDB method

    has(key) { return this.db.doesExist(key); } // always returns bool

    keys() { return this.db.getKeys(); }

    values() { return this.db.getValues(); }

    set(key, value) { return this.db.putSync(key, value); }


    /**
     * Native LMDB methods (small subset)
     */

    /**
    * Get the value stored by given id/key
    * @param key The key for the entry
    * @param options Additional options for the retrieval
    **/
    get(key, options) { return this.db.get(key, options); }

    /**
    * Get the entry stored by given id/key, which includes both the value and the version number (if available)
    * @param key The key for the entry
    * @param options Additional options for the retrieval
    **/
    getEntry(key, options) { return this.db.getEntry(key, options); }

    /**
    * Get the value stored by given id/key in binary format, as a Buffer
    * @param key The key for the entry
    **/
    getBinary(key) { return this.db.getBinary(key); }

    /**
    * Asynchronously get the values stored by the given ids and return the
    * values in array corresponding to the array of keys.
    * @param keys The keys for the entries to get
    **/
    getMany(keys, cb){ return this.db.getMany(keys, cb); }

    /**
    * Store the provided value, using the provided id/key
    * @param key The key for the entry
    * @param value The value to store
    * @param version The version number to assign to this entry
    **/
    put(key, value, version) { this.db.put(key, value, version); }

    /**
    * Remove the entry with the provided id/key, conditionally based on the provided existing version number
    * @param key The key for the entry to remove
    **/
    remove(key) { return this.db.remove(key); }

    /**
    * Remove the entry with the provided id/key, conditionally based on the provided existing version number
    * @param key The key for the entry to remove
    * @param version If provided the remove will only succeed if the previous version number matches this (atomically checked)
    **/
    removeVersion(key, version) {
        if (version === undefined) throw new Error("Version must be provided")
        return this.db.remove(key, version);
    }

    /**
    * Remove the entry with the provided id/key and value (mainly used for dupsort databases) and optionally the required
    * existing version
    * @param key The key for the entry to remove
    * @param value The value for the entry to remove
    **/
    removeValue(key, value) { return this.db.remove(key, value); }

    /**
    * Synchronously store the provided value, using the provided id/key, will return after the data has been written.
    * @param key The key for the entry
    * @param value The value to store
    * @param version The version number to assign to this entry
    **/
    putSync(key, value, version) { return this.db.putSync(key, value, version); }


    /**
    * Synchronously remove the entry with the provided id/key
    * existing version
    * @param key The key for the entry to remove
    **/
    removeSync(key) { return this.db.removeSync(key); }

    /**
    * Synchronously remove the entry with the provided id/key and value (mainly used for dupsort databases)
    * existing version
    * @param key The key for the entry to remove
    * @param value The value for the entry to remove
    **/
    removeValueSync(key, value) { return this.db.removeSync(key, value); }

    /**
    * Get all the values for the given key (for dupsort databases)
    * existing version
    * @param key The key for the entry to remove
    * @param rangeOptions The options for the iterator
    **/
    getValues(key, rangeOptions) { return this.db.getValues(key, rangeOptions); }

    /**
    * Get the count of all the values for the given key (for dupsort databases)
    * existing version
    * @param key The key for the entry to remove
    * @param rangeOptions The options for the range/iterator
    **/
    getValuesCount(key, rangeOptions) { return this.db.getValuesCount(key, rangeOptions); }

    /**
    * Get all the unique keys for the given range
    * existing version
    * @param rangeOptions The options for the range/iterator
    **/
    getKeys(rangeOptions) { return this.db.getKeys(rangeOptions); }

    /**
    * Get the count of all the unique keys for the given range
    * existing version
    * @param rangeOptions The options for the range/iterator
    **/
    getKeysCount(rangeOptions) { return this.db.getKeysCount(rangeOptions); }

    /**
    * Get all the entries for the given range
    * existing version
    * @param rangeOptions The options for the range/iterator
    **/
    getRange(rangeOptions) { return this.db.getRange(rangeOptions); }

    /**
    * Get the count of all the entries for the given range
    * existing version
    * @param rangeOptions The options for the range/iterator
    **/
    getCount(rangeOptions) { return this.db.getCount(rangeOptions); }

    /**
    * Check if an entry for the provided key exists
    * @param key Key of the entry to check
    */
    doesExist(key) { return this.db.doesExist(key); }

    /**
    * Check if an entry for the provided key/value exists
    * @param id Key of the entry to check
    * @param value Value of the entry to check
    */
    doesExistValue(key, value) { return this.db.doesExist(key, value); }

    /**
    * Check if an entry for the provided key exists with the expected version
    * @param key Key of the entry to check
    * @param version Expected version
    */
    doesExistVersion(key, version) { return this.db.doesExist(key, version); }

    /**
    * Delete this database/store (asynchronously).
    **/
    drop() { return this.db.drop(); }

    /**
    * Synchronously delete this database/store.
    **/
    dropSync() { return this.db.dropSync(); }

    /**
    * Returns statistics about the current database
    **/
    getStats() { return this.db.getStats(); }

    /**
    * Asynchronously clear all the entries from this database/store.
    **/
    clearAsync() { return this.db.clearAsync(); }

    /**
    * Synchronously clear all the entries from this database/store.
    **/
    clearSync() { return this.db.clearSync(); }

    /**
    * Make a snapshot copy of the current database at the indicated path
    * @param path Path to store the backup
    * @param compact Apply compaction while making the backup (slower and smaller)
    **/
    backup(path, compact) { return this.db.backup(path, compact); }

    /**
    * Close the current database.
    **/
    close() { return this.db.close(); }

}

module.exports = Db
