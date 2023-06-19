'use strict'


// Utils
const debug = require('debug')('canvas-index')
const EE = require('eventemitter2')

// App includes
const BitmapManager = require('./lib/BitmapManager')
const Bitmap = require('./lib/Bitmap')

// Schemas
// TODO: Use JSON Schema and a proper validator instead
const DOCUMENT_SCHEMAS = {
    // Generic document schema
    document: require('./schemas/Document').toJSON(),
    // Data abstraction schemas
    file: require('./schemas/data/abstraction/File').toJSON(),
    tab: require('./schemas/data/abstraction/Tab').toJSON(),
    note: require('./schemas/data/abstraction/Note').toJSON()
}


/**
 * Canvas Index
 */

class Index extends EE {

    #db
    #epoch = "e0"   // Epoch functionality in the TODO list

    constructor(db) {

        // Initialize event emitter
        super({
            wildcard: true,         // set this to `true` to use wildcards
            delimiter: '/',         // the delimiter used to segment namespaces
            newListener: true,      // set this to `true` if you want to emit the newListener event
            removeListener: true,   // set this to `true` if you want to emit the removeListener event
            maxListeners: 32,       // the maximum amount of listeners that can be assigned to an event
            verboseMemoryLeak: false,   // show event name in memory leak message when
                                        // more than maximum amount of listeners is assigned
            ignoreErrors: false     // disable throwing uncaughtException if an error event is emitted
                                    //and it has no listeners
        })

        // Database instance
        this.#db = db

        // Main object (document) dataset
        this.universe = this.#db.createDataset('documents')

        // Main indexes (TODO: Rework)
        this.hash2oid = this.#db.createDataset('hash2oid')

        // Current context for bitmap operations
        this.context = new Map()

        // In-memory bitmap cache
        // Implemented
        this.bitmapCache = new Map()

        // Bitmap managers
        this.contextBitmaps = new BitmapManager(this.#db.createDataset('context'), this.bitmapCache)
        this.featureBitmaps = new BitmapManager(this.#db.createDataset('features'), this.bitmapCache)

        // Timeline (txLog)
        // Metadata

    }


    /**
     * Document management
     */

    async insertDocument(doc, contextArray = [], featureArray = []) {

        debug('insertDocument()', doc, contextArray, featureArray)

        // Validate document
        let parsed = this.#validateDocument(doc)
        debug('Document validated', parsed)

        // Add document type to the featureArray if not present
        if (!featureArray.includes(parsed.type)) featureArray.push(parsed.type)

        // Update existing document if already present
        let res = this.hash2oid.get(parsed.hashes.sha1) // TODO: Primary hash algo should be set by a config value
        if (res) {
            debug('Document already present, updating..')
            return this.updateDocument(parsed, contextArray, featureArray)
        }

        // Update internal indexes
        let updateHash2oid = this.hash2oid.put(parsed.hashes.sha1, parsed.id)
        let updateUniverse = this.universe.put(parsed.id, parsed)

        // Update bitmaps
        let tickContextArrayBitmaps = this.#tickContextArrayBitmaps(contextArray, parsed.id)
        let tickFeatureArrayBitmaps = this.#tickFeatureArrayBitmaps(featureArray, parsed.id)

        // Execute in parallel
        await Promise.all([
            updateHash2oid,
            updateUniverse,
            tickContextArrayBitmaps,
            tickFeatureArrayBitmaps
        ])

        return parsed

    }

    // TODO: Evaluate if a separate method to retrieve multiple documents is needed
    async getDocuments(ids = [], cb = null) {
        if (!Array.isArray(ids)) { ids = [ids]; }

        let res;
        if (ids.length === 1) {
            res = this.universe.get(ids[0], cb); //sync
        } else {
            res = await this.universe.getMany(ids, cb);
        }

        if (cb) { cb(null, res); }
        return res;
    }

    // TODO: Rewrite to support an array of hashes
    getDocumentByHash(hash) {
        let id = this.hash2oid.get(hash)
        if (!id) return null
        return this.universe.get(id)
    }

    async listDocuments(contextArray = [], featureArray = []) {
        let documents = []

        if (!contextArray.length && !featureArray.length) {
            documents = this.universe.list()
            return documents
        }

        let calculatedContextBitmap = this.contextBitmaps.addMany(contextArray)
        debug('Context IDs', calculatedContextBitmap)

        let calculatedFeatureBitmap = this.featureBitmaps.addMany(featureArray)
        debug('Feature IDs', calculatedFeatureBitmap)

        let result = BitmapManager.addBitmaps([calculatedContextBitmap, calculatedFeatureBitmap])
        debug('Result IDs', result.toArray())

        documents = await this.universe.getMany(result.toArray())
        debug('Documents', documents)

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

    async createFeature(feature) {}

    async hasFeature(feature) {}

    async getFeature(feature) {}

    async removeFeature(feature) {}

    async getFeatureStats(feature) {}

    async listFeatures() {}

    async tickFeature(feature, id) {}

    async untickFeature(feature, id) {}


    /**
     * Schema management
     */

    listDocumentSchemas() { return DOCUMENT_SCHEMAS; }

    hasDocumentSchema(schema) { return DOCUMENT_SCHEMAS[schema] ? true : false; }

    getDocumentSchema(schema) {
        // TODO: Rework (this ugly workaround [for inconsistent schema names])
        if (type.includes('/')) schema = schema.split('/').pop()
        if (!DOCUMENT_SCHEMAS[schema]) return null
        return DOCUMENT_SCHEMAS[schema]
    }


    /**
     * Filter management
     */

    // Regexp
    // Timeline
    // Metadata


    /**
     * Internal methods
     */


    #validateDocument(doc, schema ) {
        if (typeof doc !== 'object') throw new Error('Document is not an object')
        if (!doc.id) doc.id = this.#genDocumentID()

        // This part needs some love

        let initialized = new Document(doc)
        return initialized
    }

    // Generate a new document ID
    #genDocumentID() {
        let id = this.universe.count() + 1000
        return id++
    }

    async #tickContextArrayBitmaps(bitmapIdArray = [], id) {
        for (const context of bitmapIdArray) {
            debug(`Updating bitmap for context ID "${context}"`);
            await this.contextBitmaps.tick(context, id);
        }
    }

    async #tickFeatureArrayBitmaps(bitmapIdArray = [], id) {
        for (const feature of bitmapIdArray) {
            debug(`Updating bitmap for feature ID "${feature}"`)
            await this.featureBitmaps.tick(feature, id)
        }
    }

}

module.exports = Index
