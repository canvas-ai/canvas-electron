'use strict'

const RoaringBitmap32 = require('roaring/RoaringBitmap32')
const Bitmap = require('./Bitmap');
const { id } = require('date-fns/locale');
const debug = require('debug')('@canvas:db:index:bitmapManager');


class BitmapManager {

    #db;
    #cache;

    /**
     * BitmapManager constructor
     *
     * @param {*} db
     * @param {*} cache
     * @param {*} options
     */
    constructor(db = new Map(), cache = new Map(), options = {
        rangeMin: 0,
        rangeMax: 4294967296 // 2^32
    }) {
        // A suitable DB backend with a Map() like interface
        this.#db = db
        // A suitable Caching backend with a Map() like interface
        this.#cache = cache // Not used for now

        // This should probably be implemented one abstraction layer up
        this.rangeMin = options.rangeMin
        this.rangeMax = options.rangeMax

        debug(`BitmapManager initialized with rangeMin: ${this.rangeMin}, rangeMax: ${this.rangeMax}`)
    }


    /**
     * Main BitmapManager interface (sync)
     */

    // TODO: Implement proper async methods
    tick(key, idArray, autoCreateBitmap = true, autoSave = true) {
        return this.tickSync(key, idArray, autoCreateBitmap, autoSave)
    }

    tickSync(key, idArray, autoCreateBitmap = true, autoSave = true) {
        let bitmap = this.getBitmap(key)
        if (!bitmap) {
            debug(`Bitmap with key ID "${key}" not found`)
            if (!autoCreateBitmap) {
                throw new Error(`Bitmap with key ID "${key}" not found`)
            }

            // Return the newly created bitmap
            return this.createBitmap(key, idArray, autoSave)
        }

        if (typeof idArray === 'number') {
            bitmap.tick(idArray)
        } else {
            bitmap.tickMany(idArray)
        }

        if (autoSave) {
            debug(`Implicit save for bitmap with key ID "${key}"`)
            this.#saveBitmapToDb(key, bitmap)
        }

        return bitmap
    }

    // TODO: Implement proper async methods
    untick(key, idArray, autoSave = true) {
        return this.untickSync(key, idArray, autoSave)
    }

    untickSync(key, idArray, autoSave = true) {
        let bitmap = this.getBitmap(key)
        if (!bitmap) { return false; } // maybe we should return an empty Bitmap instead

        if (typeof idArray === 'number') {
            bitmap.untick(idArray)
        } else {
            bitmap.untickMany(idArray)
        }

        if (autoSave) {
            debug(`Implicit save for bitmap with key ID "${key}"`)
            this.#saveBitmapToDb(key, bitmap)
        }

        return bitmap
    }

    // TODO: Implement proper async methods
    tickMany(keyArray, idArray, autoCreateBitmap = true, autoSave = true) {
        return this.tickManySync(keyArray, idArray, autoCreateBitmap, autoSave)
    }

    tickManySync(keyArray, idArray, autoCreateBitmap = true, autoSave = true) {
        if (!Array.isArray(keyArray) || !keyArray.length) {
            throw new TypeError(`First argument must be a non-empty array of bitmap keys, "${typeof keyArray}" given`);
        }

        const results = keyArray.map(key => {
            return this.tickSync(key, idArray, autoCreateBitmap, autoSave)
        });

        return results;
    }

    // TODO: Implement proper async methods
    untickMany(keyArray, idArray, autoSave = true) {
        return this.untickManySync(keyArray, idArray, autoSave)
    }

    untickManySync(keyArray, idArray, autoSave = true) {
        if (!Array.isArray(keyArray) || !keyArray.length) {
            throw new TypeError(`First argument must be a non-empty array of bitmap keys, "${typeof keyArray}" given`);
        }

        const results = keyArray.map(key => {
            return this.untickSync(key, idArray, autoSave)
        });

        return results;
    }


    /**
     * Logical operations
     */

    AND(keyArray) {
        if (keyArray.length === 0) {
            // TODO: Maybe we should return null here
            return new RoaringBitmap32();
        }

        let partial;
        for (const key of keyArray) {
            const bitmap = this.getBitmap(key);
            // If bitmap is null or empty, return an empty bitmap immediately
            if (!bitmap || bitmap.size === 0) {
                return new RoaringBitmap32();
            }
            // Initialize partial with the first non-empty bitmap
            if (!partial) {
                partial = bitmap;
                continue;
            }
            // Perform AND operation
            partial.andInPlace(bitmap);
        }

        // Return partial or an empty bitmap if it was never assigned
        return partial || new RoaringBitmap32();
    }

    OR(keyArray) {
        const validBitmaps = keyArray.map(key => this.getBitmap(key)).filter(Boolean);
        return validBitmaps.length ? RoaringBitmap32.orMany(validBitmaps) : new RoaringBitmap32();
    }

    static AND(roaringBitmapArray) {

        if (roaringBitmapArray.length === 0) { return new RoaringBitmap32(); }

        let partial;
        for (const bitmap of roaringBitmapArray) {

            if (!bitmap || bitmap.size === 0) {
                return new RoaringBitmap32();
            }

            // Initialize partial with the first non-empty bitmap
            if (!partial) {
                partial = bitmap;
                continue;
            }
            // Perform AND operation
            partial.andInPlace(bitmap);
        }

        // Return partial or an empty bitmap if it was never assigned
        return partial || new RoaringBitmap32();

    }

    static OR(roaringBitmapArray) {
        return RoaringBitmap32.orMany(roaringBitmapArray)
    }


    /**
     * Utility methods
     */

    listBitmaps() {
        let bitmaps = [...this.#db.keys()]
        return bitmaps
    }

    getActiveBitmaps() { return this.#cache.list(); }

    clearActiveBitmaps() { this.#cache.clear(); }

    hasBitmap(key) { return this.#db.has(key); }

    getBitmap(key, autoCreateBitmap = true) {
        // Return from cache if available
        if (this.#cache.has(key)) return this.#cache.get(key)

        // Load from DB
        if (this.hasBitmap(key)) return this.#loadBitmapFromDb(key)

        debug(`Bitmap with key ID "${key}" not found in the database`)
        if (!autoCreateBitmap) return null

        debug(`Creating a new bitmap with key ID "${key}"`)
        let bitmap = this.createBitmap(key)

        return bitmap
    }

    createBitmap(key, oidArrayOrBitmap = null, autoSave = true) {
        if (this.hasBitmap(key)) {
            debug(`Bitmap with key ID "${key}" already exists`);
            return false;
        }

        let idArray;
        let bitmap;

        if (!oidArrayOrBitmap) {
            debug(`Creating new empty bitmap with key ID "${key}"`);
            idArray = new RoaringBitmap32();
        } else if (oidArrayOrBitmap instanceof RoaringBitmap32) {
            debug(`Storing bitmap under new key ID "${key}"`);
            idArray = oidArrayOrBitmap;
        } else if (Array.isArray(oidArrayOrBitmap)) {
            debug(`Creating new bitmap with key ID "${key}" and ${oidArrayOrBitmap.length} elements`);
            idArray = new RoaringBitmap32(oidArrayOrBitmap);
        } else {
            debug(`Invalid input for bitmap with key ID "${key}"`);
            return false;
        }

        // Initialize a new bitmap
        bitmap = Bitmap.create(idArray, {
            type: 'static',
            key: key,
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax
        });

        // Save bitmap to DB
        if (autoSave) { this.#saveBitmapToDb(key, bitmap); }

        return bitmap;
    }

    removeBitmap(key) {
        if (!this.#db.has(key)) {
            debug(`Bitmap with key ID "${key}" not found`)
            return false
        }

        debug(`Removing bitmap with key ID "${key}"`)
        // TODO: Add error handling
        this.#cache.delete(key)
        this.#db.delete(key);

        return true
    }

    renameBitmap(key, newKey, autoSave = true) {
        let bitmap = this.getBitmap(key, false)

        if (!this.createBitmap(newKey, bitmap, autoSave)) {
            throw new Error(`Unable to create bitmap with key ID "${newKey}"`)
        }

        if (!bitmap) {
            this.removeBitmap(key) || new Error(`Unable to remove bitmap with key ID "${key}"`)
        }

        return true
    }


    /**
     * Internal methods (sync, using a Map() like interface)
     */

    #saveBitmapToDb(key, bitmap/*, overwrite = true */) {
        if (!(bitmap instanceof RoaringBitmap32)) throw new TypeError(`Input must be an instance of RoaringBitmap32`);
        // TODO: runOptimize()
        // TODO: shrinkToFit()
        // TODO: Overwrite logic

        let bitmapData = bitmap.serialize(true);
        try {
            this.#db.set(key, bitmapData);
        } catch (err) {
            throw new Error(`Unable to save bitmap ${key} to database`);
        }
    }

    #loadBitmapFromDb(key) {
        let bitmapData = this.#db.get(key);
        if (!bitmapData) {
            debug(`Unable to load bitmap "${key}" from the database`)
            return null;
        }

        let bitmap = new RoaringBitmap32();
        return Bitmap.create(bitmap.deserialize(bitmapData, true), {
            type: 'static',
            key: key,
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax
        })
    }

}

module.exports = BitmapManager

