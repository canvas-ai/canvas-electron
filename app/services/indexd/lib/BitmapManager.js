'use strict'


const RoaringBitmap32 = require('roaring/RoaringBitmap32')
const Bitmap = require('./Bitmap')
const debug = require('debug')('canvas-index-bitmapManager')

class BitmapManager {

    #db;
    #cache;
    #range;

    constructor(db = new Map(), cache = new Map(), range = { min: 0, max: 4294967296 }) {
        this.#db = db
        this.#cache = cache
        this.#range = range

        // For now we'll use the LMDBs caching mechanism
        // https://www.npmjs.com/package/lmdb#caching
        this.activeBitmaps = new Set()
        this.activeBitmapsAND = null // Precomputed AND of all active bitmaps
        this.activateBitmapsOR = null // Precomputed OR of all active bitmaps
    }

    get activeAND() { return this.getActiveAND; }
    get activeOR() { return this.getActiveOR; }


    /**
     * List all bitmaps in the database/dataset
     * @returns {Array} Array of bitmap keys
     */
    listBitmaps() {
        // TODO: Temporary workaround for Map() support
        if (this.#db instanceof Map) {
            let bitmaps = [...this.#db.keys()]
            return bitmaps
        } else {
            return this.#db.list();
        }
    }

    getActiveBitmaps() { /* TODO */ }

    clearActiveBitmaps() { /* TODO */ }

    hasBitmap(key) { return this.#db.has(key); }

    getBitmap(key) { return this.#db.get(key); }

    activateBitmap(key) { /* TODO */ }

    deactivateBitmap(key) { /* TODO */ }

    removeBitmap(key) {
        if (!this.#db.has(key)) {
            debug(`Bitmap with key ID "${key}" not found`)
            return false
        }

        debug(`Removing bitmap with key ID "${key}"`)
        // Backward compatibility with Map()
        return (this.#db instanceof Map) ? this.#db.delete(key) : this.#db.remove(key);
    }

    removeBitmapSync(key) {
        if (!this.#db.has(key)) {
            debug(`Bitmap with key ID "${key}" not found`)
            return false
        }

        debug(`Removing bitmap with key ID "${key}"`)
        return this.#db.delete(key);
    }

    /**
     * Renames a bitmap synchronously.
     *
     * @param {string} key - The key of the bitmap to be renamed.
     * @param {string} newKey - The new key for the bitmap.
     * @returns {boolean} - Returns true if the bitmap was renamed successfully, false otherwise.
     */
    renameBitmapSync(key, newKey) {
        let bitmap = this.getBitmap(key)
        if (!bitmap) {
            debug(`Bitmap with key ID "${key}" not found`)
            return false
        }

        if (!this.createBitmapSync(newKey, bitmap)) {
            debug(`Unable to create bitmap with key ID "${newKey}"`)
            return false
        }

        if (!this.removeBitmapSync(key)) {
            debug(`Unable to remove bitmap with key ID "${key}"`)
            return false
        }

        return true
    }

    /**
     * Creates a new bitmap with the given key and stores it in the database.
     * @param {string} key - The key to use for the new bitmap.
     * @param {RoaringBitmap32|Array<number>} [oidArrayOrBitmap] - The bitmap or array of numbers to use for the new bitmap.
     * @returns {boolean} - Returns true if the bitmap was successfully created and stored, false otherwise.
     */
    createBitmapSync(key, oidArrayOrBitmap) {
        if (this.hasBitmap(key)) {
            debug(`Bitmap with key ID "${key}" already exists`);
            return false;
        }

        let bitmap;

        if (!oidArrayOrBitmap) {
            debug(`Creating new empty bitmap with key ID "${key}"`);
            bitmap = new RoaringBitmap32();
        } else if (oidArrayOrBitmap instanceof RoaringBitmap32) {
            debug(`Storing bitmap under new key ID "${key}"`);
            bitmap = oidArrayOrBitmap;
        } else if (Array.isArray(oidArrayOrBitmap)) {
            debug(`Creating new bitmap with key ID "${key}" and ${oidArrayOrBitmap.length} elements`);
            bitmap = new RoaringBitmap32(oidArrayOrBitmap);
        } else {
            debug(`Invalid input for bitmap with key ID "${key}"`);
            return false;
        }

        this.#db.set(key, bitmap);
        return bitmap;
    }


    // Ticks a single key with an ID array or a bitmap
    tickSync(key, oidArrayOrBitmap, autoCreateBitmap = true, implicitSave = true) {
        let bitmap = this.getBitmap(key)
        if (!bitmap) {
            debug(`Bitmap with key ID "${key}" not found`)
            if (!autoCreateBitmap) return false

            debug(`Creating new bitmap with key ID "${key}"`)
            bitmap = new RoaringBitmap32()
        }

        bitmap = bitmap.addMany(oidArrayOrBitmap)
        if (implicitSave) {
            debug(`Implicit save for bitmap with key ID "${key}"`)
            this.#db.set(key, bitmap)
        }

        return bitmap
    }

    /**
     * Updates multiple bitmaps with the given array of keys and either an array of IDs or a RoaringBitmap32 instance.
     * @param {string[]} keyArray - An array of bitmap keys to update.
     * @param {number[]|RoaringBitmap32} oidArrayOrBitmap - An array of IDs or a RoaringBitmap32 instance to update the bitmaps with.
     * @param {boolean} [autoCreateBitmaps=true] - Whether to automatically create the bitmaps if they don't exist.
     * @param {boolean} [implicitSave=true] - Whether to implicitly save the changes made to the bitmaps.
     * @returns {boolean} - Returns true if the update was successful.
     * @throws {TypeError} - Throws a TypeError if keyArray is not an array or is empty, or if oidArrayOrBitmap is not an array of IDs or a RoaringBitmap32 instance.
     */
    tickManySync(keyArray, oidArrayOrBitmap, autoCreateBitmaps =  true, implicitSave = true) {
        if (!Array.isArray(keyArray) || !keyArray.length) {
            throw new TypeError(`keyArray must be an non-empty array of bitmap keys`);
        }

        if (!Array.isArray(oidArrayOrBitmap) && !(oidArrayOrBitmap instanceof RoaringBitmap32)) {
            throw new TypeError(`oidArrayOrBitmap must be an array of IDs or a instance of RoaringBitmap32`);
        }

        keyArray.forEach(key => {
            this.tickSync(key, oidArrayOrBitmap, autoCreateBitmaps, implicitSave)
        })

        return true

    }

    // Ticks all active bitmaps with an array of IDs or a bitmap
    tickAllActiveSync(oidArrayOrBitmap) { /* TODO */ }

    // Ticks all bitmaps with an array of IDs or a bitmap
    tickAllSync(oidArrayOrBitmap) {

    }


    // Ticks a single key with an ID array or a bitmap
    untickSync(key, oidArrayOrBitmap, implicitSave = true) {
        let bitmap = this.getBitmap(key)
        if (!bitmap) {
            debug(`Bitmap with key ID "${key}" not found`)
            return false
        }

        bitmap = bitmap.removeMany(oidArrayOrBitmap)
        if (implicitSave) {
            debug(`Implicit save for bitmap with key ID "${key}"`)
            this.#db.set(key, bitmap)
        }

        return bitmap
    }

    // Ticks multiple keys with an array of IDs or a bitmap
    untickManySync(keyArray, oidArrayOrBitmap) {
        // Bulk operation logic
        // ...
    }

    // Ticks all active bitmaps with an array of IDs or a bitmap
    untickAllActiveSync(oidArrayOrBitmap) { /* TODO */ }

    // Ticks all bitmaps with an array of IDs or a bitmap
    untickAllSync(oidArrayOrBitmap) {
        // Consider the performance impact of ticking all bitmaps
        // ...
    }

    OR(keyArray, inputBitmap = null) {

    }

    AND(keyArray, inputBitmap = null) {

    }

    XOR(keyArray, inputBitmap = null) {

    }


    getActiveAND() {}
    getActiveOR() {}

    andCardinality() {}
    orCardinality() {}
    jaccardIndex() {}


    #saveBitmapToDb(key) {}
    #loadBitmapFromDb(key) {}
    #saveAllBitmapsToDb() {}
    #loadAllBitmapsToDb() {}


    /*
    async openBitmapArray(bitmapIdArray) {
        let res = await this.#db.getMany(bitmapArray)
        // Return an array if initialized bitmaps
        return res

    }

    openBitmap(key) {

        // Checks if bitmap is already cached
        if (this.#cache.has(key)) {
            debug(`Fetching bitmap ID "${key}" from cache`)
            return this.#cache.get(key)
        }

        if (this.#db.has(key)) {
            debug(`Loading bitmap ID "${key}" from DB`)

            // Initialize bitmap
            let bitmap = this.loadBitmap(key)

            // Update the bitmap cache
            this.#cache.set(key, bitmap)

            return bitmap
        }

        debug(`Bitmap ID "${key}" not found`)
        return new Bitmap(key)

    }


    createBitmap(key, bitset = null) { //initialize = true) {

        // TODO: Add usable debug information
        let bitmap = this.openBitmap(key)
        if (bitmap) { return bitmap }

        debug(`Creating new bitmap with ID "${key}"`)
        bitmap = new Bitmap(key, bitset)

        // Update the bitmap cache
        this.#cache.set(key, bitmap)

        // Save changes to the DB
        this.saveBitmapSync(key, bitmap)
        return bitmap

    }

    static createBitmap(key, bitset = null, db) {
        debug(`Creating new bitmap (static) with ID "${key}"`)
        let bitmap = new Bitmap(key, bitset)

        // Saving bitmap to DB
        BitmapManager.saveBitmapSync(key, bitmap, db)
        return bitmap
    }

    async untickAll(bitset) {
        let db = this.#db.backend
        for (let key of db.getKeys()) {
            let isCached = this.#cache.has(key)
            let bitmap = this.openBitmap(key)
            bitmap.untick(bitset)
            this.saveBitmapSync(key, bitmap)
            if (!isCached) this.#cache.delete(key)
        }
    }

    tick(key, id) {

        debug(`Tick for bitmap "${key}" docID "${id}"`)
        let bitmap = this.openBitmap(key)
        if (!bitmap) {
            debug(`Bitmap ID ${key} not found`)
            bitmap = this.createBitmap(key, id)
        } //throw new Error('Bitmap ${key} not found')

        if (bitmap.has(id)) return true
        bitmap.tick(id)

        this.#cache.set(key, bitmap)
        this.saveBitmapSync(key, bitmap)

        return true
    }

    untick(key, id) {
        debug(`Tick for bitmap "${key}" docID "${id}"`)
        let bitmap = this.openBitmap(key)
        if (!bitmap) return false // throw new Error('Bitmap ${key} not found')
        if (bitmap.has(id)) return true

        bitmap.untick(id)
        this.#cache.set(key, bitmap)
        this.saveBitmapSync(key, bitmap)
        return true
    }

    loadBitmap(key) {

        let rawBitmap = this.#db.get(key)
        if (!rawBitmap) {
            debug(`Unable to load bitmap "${key}" from the database`)
            return new Bitmap(key)
        }

        return Bitmap.deserialize(key, rawBitmap, true)

    }

    async saveBitmap(key, bitmap) {
        let serialized = bitmap.serialize(true)
        if (!serialized) throw new Error(`Unable to serialize bitmap ${key}`)

        debug(`Saving bitmap key "${key}"`)
        let result  = await this.#db.put(key, serialized)
        if (!result) throw new Error(`Unable to save bitmap ${key} to database`)

        return result
    }

    saveBitmapSync(key, bitmap) {
        let serialized = bitmap.serialize(true)
        if (!serialized) throw new Error(`Unable to serialize bitmap ${key}`)

        debug(`Saving (sync) bitmap key "${key}"`)
        return this.#db.putSync(key, serialized)
    }

    static async saveBitmap(key, bitmap, db) {
        let serialized = bitmap.serialize(true)
        if (!serialized) throw new Error(`Unable to serialize bitmap ${key}`)

        debug(`Saving bitmap as key "${key}"`)
        let result = await db.put(key, serialized)
        if (!result) throw new Error(`Unable to save bitmap ${key} to database`)
        return result
    }

    static saveBitmapSync(key, bitmap, db) {
        let serialized = bitmap.serialize(true)
        if (!serialized) throw new Error(`Unable to serialize bitmap ${key}`)

        debug(`Saving (sync) bitmap as key "${key}"`)
        return db.putSync(key, serialized)
    }

    addBitmapArray(roaringBitmapArray) {

        console.log('-------- test -------------')
        console.log(roaringBitmapArray)

        // Make sure we are getting a valid array
        if (!Array.isArray(roaringBitmapArray) ||
            !roaringBitmapArray.length) throw new TypeError("Input must be an array of RoaringBitmap32 bitmaps")

        // Cleanup the array
        roaringBitmapArray = roaringBitmapArray.filter(bitmap => bitmap instanceof RoaringBitmap32);

        // Return an empty roaring bitmap as a fallback
        if (!roaringBitmapArray.length) return new RoaringBitmap32()

        let partial = roaringBitmapArray.shift()
        while(roaringBitmapArray.length > 0) {
            partial = partial.andInPlace(roaringBitmapArray.shift())
            debug(`Partial bitmap to add: ${partial.toArray()}`)
        }

        debug(`addBitmapArray result: ${partial.toArray()}`)
        return partial
    }

    addMany(bitmapIdArray, autoCreateBitmaps = false) {

        // Fallback to an empty RoaringBitmap32
        if (!Array.isArray(bitmapIdArray) || !bitmapIdArray.length) {
            return new RoaringBitmap32()
        }

        let bitmapsToCalculate = bitmapIdArray.reduce((acc, bitmapID) => {
            let bitmap = (autoCreateBitmaps) ?
                this.createBitmap(bitmapID) :
                this.openBitmap(bitmapID)

            if (bitmap) acc.push(bitmap)
            return acc
        }, [])

        if (! bitmapsToCalculate.every(element => element instanceof RoaringBitmap32)) {
            throw new TypeError("Input must be an array of RoaringBitmap32 bitmaps")
        }

        let partial = bitmapsToCalculate.shift()
        while(bitmapsToCalculate.length > 0) {
            partial = partial.andInPlace(bitmapsToCalculate.shift())
            debug(`Partial bitmap to add: ${partial.toArray()}`)
        }

        return partial //.toArray()

    }

    static addBitmaps(bitmapArray) {
        // Fallback to an empty RoaringBitmap32
        if (!Array.isArray(bitmapArray) || !bitmapArray.length)
          return new RoaringBitmap32();

        if (!bitmapArray.every(element => element instanceof RoaringBitmap32)) {
          throw new TypeError("Input must be an array of RoaringBitmap32 bitmaps");
        }

        let partial = bitmapArray.shift();

        if (bitmapArray.length === 0) {
          return partial;
        }

        while (bitmapArray.length > 0) {
          const nextBitmap = bitmapArray.shift();

          // Perform AND operation only if the next bitmap is not empty
          if (nextBitmap.size > 0) {
            partial.andInPlace(nextBitmap);
          }

          debug(`Partial bitmap after AND operation: ${partial.toArray()}`);
        }

        debug(`addBitmaps result: ${partial.toArray()}`);
        return partial;
    }



    //intersect() {}

    orMany(bitmapArray) {

        let bitmapsToCalculate = []

        bitmapArray.forEach(bitmap => {
            let initialized = this.createBitmap(bitmap)
            console.log(`orMany initialized ${initialized}`)
            bitmapsToCalculate.push(initialized)
        });


        debug(`Partial bitmap length ${bitmapsToCalculate.length}`)
        let result = RoaringBitmap32.orMany(bitmapsToCalculate)
        debug(result)
        return result

    }

    static orMany(bitmapArray) {
        return RoaringBitmap32.orMany(bitmapArray)
    } */

}

module.exports = BitmapManager

