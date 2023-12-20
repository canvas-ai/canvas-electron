// Utils
const debug = require('debug')('canvas-db-index')
const EE = require('eventemitter2')

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
 * Canvas DB Index
 */

class Index extends EE {


    #db
    #epoch = "e0"   // 2^32 bitmap limit

    constructor(options = {}) {

        // Initialize event emitter
        super()

        // Initialize database backend
        this.#db = options.db

        // Bitmaps
        this.bitmaps = this.#db.createDataset('bitmaps')
        // Shared Map() to cache bitmaps in memory
        this.bitmapCache = new MemCache()

        // HashMap(s)
        // To decide whether to use a single dataset
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

    AND(bitmaps) {
        return BitmapManager.AND(bitmaps)
    }

    async updateContextBitmaps(contextArray, oidOrArray) {

        await this.bmContexts.tickMany(contextArray, oidOrArray)
    }

    async updateFeatureBitmaps(featureArray, oidOrArray) {

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
