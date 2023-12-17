// Utils
const debug = require('debug')('canvas-db-index')
const EE = require('eventemitter2')

// App includes
const BitmapManager = require('./lib/BitmapManager')

// Constants
const MAX_DOCUMENTS = 4294967296 // 2^32
const MAX_CONTEXTS = 1024 // 2^10
const MAX_FEATURES = 65536 // 2^16
const MAX_FILTERS = 65536 // 2^16
const INTERNAL_BITMAP_ID_MIN = 1000
const INTERNAL_BITMAP_ID_MAX = 1000000


/**
 * Index
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
        this.bitmaps = this.db.createDataset('bitmaps')

        // HashMap(s)
        // To decide whether to use a single dataset
        // sha1/<hash> | oid
        // md5/<hash> | oid
        // or a separate dataset per hash type
        this.hash2oid = this.db.createDataset('hash2oid')

        // Internal Bitmaps
        this.bmInternal = new BitmapManager(
            this.bitmaps.createDataset('internal'),
            this.bitmapCache, {
                rangeMin: INTERNAL_BITMAP_ID_MIN,
                rangeMax: INTERNAL_BITMAP_ID_MAX
            })

        // Contexts
        this.bmContexts = new BitmapManager(
            this.bitmaps.createDataset('contexts'),
            this.bitmapCache, {
                rangeMin: INTERNAL_BITMAP_ID_MAX,
            })

        // Features
        this.bmFeatures = new BitmapManager(
            this.bitmaps.createDataset('features'),
            this.bitmapCache, {
                rangeMin: INTERNAL_BITMAP_ID_MAX,
            })

        // Filters
        this.bmFilters = new BitmapManager(
            this.bitmaps.createDataset('filters'),
            this.bitmapCache, {
                rangeMin: INTERNAL_BITMAP_ID_MAX,
            })

        // Queues
        // TODO

        // Timeline
        // <timestamp> | <action> | diff {path: [bitmap IDs]}
        // Action: create, update, delete
        // TODO

    }

    async updateContextBitmaps(contextArray, oid) {
        if (!Array.isArray(contextArray)) { throw new TypeError('Context array must be an array'); }
        if (typeof oid !== 'number') { throw new TypeError('OID must be a number'); }

        for (const contextID of contextArray) {
            await this.bmContexts.tick(contextID, oid);
        }
    }

    async tickContextBitmaps(contextArray, oidArray) {}
    async untickContextBitmaps(contextArray, oidArray) {}

    async tickFeatureBitmaps(featureArray, oidArray) {}
    async untickFeatureBitmaps(featureArray, oidArray) {}2


    async updateFeatureBitmaps(featureArray, oid) {
        if (!Array.isArray(featureArray)) { throw new TypeError('Feature array must be an array'); }
        if (typeof oid !== 'number') { throw new TypeError('OID must be a number'); }

        for (const featureID of featureArray) {
            await this.bmFeatures.tick(featureID, oid);
        }
    }

    /**
     * Document management
     */

    async insertDocument(doc, contextArray = [], featureArray = []) {


        // Extract features
        let extractedFeatures = this.#extractDocumentFeatures(doc)
        let combinedFeatureArray = [...featureArray, ...extractedFeatures]
        debug('Document feature array', combinedFeatureArray)

        // Update existing document if already present
        let res = this.hash2oid.get(parsed.hashes.sha1)
        if (res) {
            debug('Document already present, updating..')
            debug(`Document ID: ${res}`)
        }

        try {
            // Insert document
            await this.documents.put(parsed.id, parsed)

            if (contextArray.length > 0) {
                debug(`Updating context array ${contextArray}`)
                this.bmContexts.tickManySync(contextArray, parsed.id);
            }

            if (combinedFeatureArray.length > 0) {
                debug(`Updating feature array ${combinedFeatureArray}`)
                this.bmFeatures.tickManySync(combinedFeatureArray, parsed.id)
            }

            // Final step: update hash2oid
            await this.hash2oid.put(parsed.hashes.sha1, parsed.id);
            debug('Document insert and indexes update complete');

            // Return the parsed document, id, meta + bling-bling included
            return parsed;

        } catch (error) {
            debug('Error during document insert:', error);
            // TODO: Implement a rollback for bitmap updates, maybe split this
            // method into separate methods for document insert and bitmap updates
            throw error;
        }
    }

    getDocument(id) { return this.documents.get(id); }

    getDocumentByHash(hash, hashType = '') {
        if (typeof hash !== 'string') { throw new TypeError('Hash must be a string'); }
        if (hashType && typeof hashType !== 'string') { throw new TypeError('Hash type must be a string'); }

        let fullHash = hashType ? `${hashType}/${hash}` : hash;

        let id = this.hash2oid.get(fullHash);
        if (!id) return null;

        return this.documents.get(id);
    }

    async getDocuments(ids = [], cb = null) {
        debug('getDocuments()', ids, cb)
        if (!Array.isArray(ids)) { throw new TypeError('IDs must be an array'); }

        try {
            const res = await this.documents.getMany(ids);
            if (cb) { cb(null, res); }
            return res;
        } catch (err) {
            if (cb) { cb(err); } else { throw err; }
        }
    }

    async listDocuments(contextArray = [], featureArray = []) {
        debug(`listDocuments(): ContextArray: ${contextArray}; FeaturesArray: ${featureArray}`)
        if (contextArray === null) contextArray = []
        if (featureArray === null) featureArray = []

        let documents
        if (!contextArray.length && !featureArray.length) {
            documents = this.documents.listValues()
            return documents
        }

        let bitmaps = []
        if (contextArray.length) {
            bitmaps.push(this.bmContexts.AND(contextArray))
        }

        if (featureArray.length) {
            bitmaps.push(this.bmFeatures.AND(featureArray))
        }

        if (bitmaps.length === 0) return []

        let result = BitmapManager.AND(bitmaps)
        debug('Result IDs', result.toArray())

        documents = await this.documents.getMany(result.toArray())
        return documents
    }

    async updateDocument(doc, contextArray = [], featureArray = []) {
        return true
    }

    async removeDocument(doc) {

    }

    async removeDocumentByID(id) {

    }

    async removeDocumentByHash(hash) {

    }



    /**
     * Feature management
     */

    async createFeature(feature, idArray = []) {
        if (!feature) throw new Error('Feature is required')
        return this.bmFeatures.createBitmap(feature, idArray)
    }

    async removeFeature(feature) {}

    async tickFeatures(featureArray, idArray) {}

    async untickFeatures(featureArray, idArray) {}

    createFeatureSync(feature, idArray = []) {
        if (!feature) throw new Error('Feature is required')
        return this.bmFeatures.createBitmapSync(feature, idArray)
    }

    removeFeatureSync(feature) {}

    tickFeaturesSync(featureArray, idArray) {}

    untickFeaturesSync(featureArray, idArray) {}

    listFeatures() {
        return this.bmFeatures.listBitmaps();
    }

    hasFeature(feature) {
        return this.bmFeatures.hasBitmap(feature)
    }

    getFeatureBitmap(feature) {
        return this.bmFeatures.getBitmap(feature)
    }

    getFeatureStats(feature) { /* TODO */ }


}

module.exports = Index
