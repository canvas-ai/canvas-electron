// Utils
const EE = require('eventemitter2')
const debug = require('debug')('@canvas:db:index')

// App includes
const BitmapManager = require('./lib/BitmapManager')
const MemCache = require('./lib/MemCache')

// Constants
const MAX_DOCUMENTS = 4294967296 // 2^32
const MAX_CONTEXTS = 1024 // 2^10
const MAX_FEATURES = 65536 // 2^16
const MAX_FILTERS = 65536 // 2^16
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
                rangeMin: INTERNAL_BITMAP_ID_MAX,
            })

        // Features
        this.bmFeatures = new BitmapManager(
            this.bitmaps.createDataset('features'),
            this.bitmapCache,
            {
                rangeMin: INTERNAL_BITMAP_ID_MAX,
            })

        // Filters
        this.bmFilters = new BitmapManager(
            this.bitmaps.createDataset('filters'),
            this.bitmapCache,
            {
                rangeMin: INTERNAL_BITMAP_ID_MAX,
            })

        // Queues
        // TODO

        // Timeline
        // <timestamp> | <action> | diff {path: [bitmap IDs]}
        // Action: create, update, delete
        // TODO

    }

    /**
     * Main Index methods
     */

    async insert(id, contextArray, featureArray, filterArray) {}

    async update(id, contextArray, featureArray, filterArray) {}

    async remove(id, contextArray, featureArray, filterArray) {
        if (!id) throw new Error('Document ID required')
        if (!contextArray) throw new Error('Context array required')
        debug(`Removing document ${id} from context bitmaps ${contextArray}`)

    }

    async delete(id) {
        if (!id) throw new Error('Document ID required')
        debug(`Deleting document ${id} from index`)
    }

    async listEntries(contextArray, featureArray, filterArray) {}

    async listContexts() {}

    async listFeatures() {}

    async listFilters() {}


    async tickFeatureArray(id, featureArray) {
        if (!id) throw new Error('Document ID required')
        if (!featureArray) throw new Error('Feature array required')
    }

    async untickFeatureArray(id, featureArray) {
        if (!id) throw new Error('Document ID required')
        if (!featureArray) {
            debug(`untickFeatureArray(): No feature array provided, unticking all features for document ${id}`)
        }
    }

    async tickContextArray(id, contextArray) {

    }

    async untickContextArray(id, contextArray) {

    }


    /**
     * Bitmap methods
     */

    AND(bitmaps) {
        return BitmapManager.AND(bitmaps)
    }

    async updateContextBitmaps(contextArray, oidOrArray) {
        debug(`updateContextBitmaps(): contextArray: ${contextArray}, oidOrArray: ${oidOrArray}`)
        await this.bmContexts.tickMany(contextArray, oidOrArray)
    }

    async updateFeatureBitmaps(featureArray, oidOrArray) {
        debug(`updateFeatureBitmaps(): featureArray: ${featureArray}, oidOrArray: ${oidOrArray}`)
        await this.bmFeatures.tickMany(featureArray, oidOrArray)
    }

    /**
     * Calculate the AND of an array of roaring bitmaps IDs
     * @param {Array} idArray: Array of bitmap IDs
     * @returns {Array|RoaringBitmap32} Array of bitmap IDs or RoaringBitmap32
     */
    async idArrayAND(idArray, returnAsBitmap = false) {

    }

    contextArrayAND(bitmapArray, returnAsArray = false) {
        return this.bmContexts.AND(bitmapArray)
    }

    featureArrayAND(bitmapArray, returnAsArray = false) {
        return this.bmFeatures.AND(bitmapArray)
    }

    /**
     * Calculate the OR of an array of roaring bitmaps IDs
     * @param {Array} idArray: Array of bitmap IDs
     * @returns {Array|RoaringBitmap32} Array of bitmap IDs or RoaringBitmap32
     */
    async idArrayOR(idArray, returnAsBitmap = false) {

    }

    /**
     * Calculate the OR of an array of roaring bitmaps
     * @param {Array} bitmapArray
     * @returns {RoaringBitmap32|Array} RoaringBitmap32 or Array of bitmap IDs
     */
    async bitmapArrayOR(bitmapArray, returnAsArray = false) {

    }

}

module.exports = Index
