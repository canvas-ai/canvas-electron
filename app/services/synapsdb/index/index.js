// Utils
const EE = require('eventemitter2')
const debug = require('debug')('@canvas:db:index')

// App includes
const BitmapManager = require('./lib/BitmapManager')
const MemCache = require('./lib/MemCache')

// Constants
//const MAX_DOCUMENTS = 4294967296 // 2^32
//const MAX_CONTEXTS = 1024 // 2^10
//const MAX_FEATURES = 65536 // 2^16
//const MAX_FILTERS = 65536 // 2^16
const INTERNAL_BITMAP_ID_MIN = 1000
const INTERNAL_BITMAP_ID_MAX = 1000000


/**
 * Main index class
 */

class Index extends EE {


    #db
    #epoch = "e0"   // 2^32 bitmap limit

    constructor(options = {}) {

        // Initialize event emitter
        super(options.eventEmitter || {})

        // Bind/initialize the database backend
        this.#db = options.db

        // Bitmaps
        this.bitmaps = this.#db.createDataset('bitmaps')
        this.bitmapCache = new MemCache() // Shared Map() to cache bitmaps in memory

        // HashMap(s)
        // To decide whether to use a single dataset with a hash type prefix
        // sha1/<hash> | oid
        // md5/<hash> | oid
        // or a separate dataset per hash type
        this.hash2oid = this.#db.createDataset('hash2oid')

        // Internal Bitmaps
        this.bmInternal = new BitmapManager(
            this.bitmaps.createDataset('internal'),
            this.bitmapCache,
            {
                rangeMin: INTERNAL_BITMAP_ID_MIN,
                rangeMax: INTERNAL_BITMAP_ID_MAX
            })

        // Contexts
        this.bmContexts = new BitmapManager(
            this.bitmaps.createDataset('contexts'),
            this.bitmapCache,
            {
                rangeMin: INTERNAL_BITMAP_ID_MIN,
            })

        // Features
        this.bmFeatures = new BitmapManager(
            this.bitmaps.createDataset('features'),
            this.bitmapCache,
            {
                rangeMin: INTERNAL_BITMAP_ID_MIN,
            })

        // Filters
        this.bmFilters = new BitmapManager(
            this.bitmaps.createDataset('filters'),
            this.bitmapCache,
            {
                rangeMin: INTERNAL_BITMAP_ID_MIN,
            })

        // Queues
        // TODO

        // Timeline
        // <timestamp> | <action> | diff {path: [bitmap IDs]}
        // Action: create, update, delete
        // TODO

    }

    /**
     * Main Index API
     */

    /*
    async getObject(id) { }

    async getObjectByHash(hash) { }

    async insertObject(id, contextArray, featureArray, filterArray) {}

    async updateObject(id, contextArray, featureArray, filterArray) {}

    async removeObject(id, contextArray, featureArray, filterArray) {}

    async deleteObject(id) { }

    async getObjectContexts(id) { }

    async addObjectFeatures(id, feature) { }

    async removeObjectFeatures(id, feature) { }

    async getObjectFeatures(id) { } */



    /**
     * Bitmap methods
     */

    async tickContextArray(idOrArray, contextArray = []) {
        if (!idOrArray) throw new Error('Document ID required')
        if (!contextArray || !contextArray.length) throw new Error('Context array required')

        if (typeof idOrArray === 'number') {
            return this.bmContexts.tick(idOrArray, contextArray)
        }

        return this.bmContexts.tickMany(idOrArray, contextArray)
    }

    async untickContextArray(idOrArray, contextArray = []) {
        if (!idOrArray) throw new Error('Document ID required')
        if (!contextArray || !contextArray.length) throw new Error('Context array required')

        if (typeof idOrArray === 'number') {
            return this.bmContexts.untick(idOrArray, contextArray)
        }

        return this.bmContexts.untickMany(idOrArray, contextArray)
    }

    async tickFeatureArray(idOrArray, featureArray = []) {
        if (!idOrArray) throw new Error('Document ID required')
        if (!featureArray || !featureArray.length) throw new Error('Feature array required')

        if (typeof idOrArray === 'number') {
            return this.bmFeatures.untick(idOrArray, featureArray)
        }

        return this.bmFeatures.untickMany(idOrArray, featureArray)
    }

    async untickFeatureArray(idOrArray, featureArray = []) {
        if (!idOrArray) throw new Error('Document ID required')
        if (!featureArray || !featureArray.length) throw new Error('Feature array required')

        if (typeof idOrArray === 'number') {
            return this.bmFeatures.untick(idOrArray, featureArray)
        }

        return this.bmFeatures.untickMany(idOrArray, featureArray)
    }


    async updateContextBitmaps(contextArray, oidOrArray) {
        debug(`updateContextBitmaps(): contextArray: ${contextArray}, oidOrArray: ${oidOrArray}`)
        await this.bmContexts.tickMany(contextArray, oidOrArray)
    }

    async updateFeatureBitmaps(featureArray, oidOrArray) {
        debug(`updateFeatureBitmaps(): featureArray: ${featureArray}, oidOrArray: ${oidOrArray}`)
        await this.bmFeatures.tickMany(featureArray, oidOrArray)
    }

    bitmapAND(bitmaps, returnAsArray = false) {
        if (!bitmaps || !bitmaps.length) throw new Error('Bitmap array required')
        if (returnAsArray) {
            let bitmap = BitmapManager.AND(bitmaps)
            return bitmap.toArray()
        }

        return BitmapManager.AND(bitmaps)
    }

    contextArrayAND(bitmapArray, returnAsArray = false) {
        if (!bitmapArray || !bitmapArray.length) throw new Error('Bitmap array required')
        if (returnAsArray) {
            let bitmap = this.bmContexts.AND(bitmapArray)
            return bitmap.toArray()
        }

        return this.bmContexts.AND(bitmapArray)
    }

    featureArrayAND(bitmapArray, returnAsArray = false) {
        if (!bitmapArray || !bitmapArray.length) throw new Error('Bitmap array required')
        if (returnAsArray) {
            let bitmap = this.bmFeatures.AND(bitmapArray, returnAsArray)
            return bitmap.toArray()
        }

        return this.bmFeatures.AND(bitmapArray)
    }

}

module.exports = Index
