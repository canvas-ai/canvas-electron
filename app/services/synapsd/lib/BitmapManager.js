'use strict'


const RoaringBitmap32 = require('roaring/RoaringBitmap32')
const Bitmap = require('./Bitmap')
const debug = require('debug')('canvas-index-bitmapManager')

class BitmapManager {

    #db
    #cache

    constructor(db, cache) {
        this.#db = db
        this.#cache = cache
    }

    list() { return this.#db.list(); }

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
    }

}


module.exports = BitmapManager