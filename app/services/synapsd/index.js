/**
 * Canvas Index
 */


// Utils
const debug = require('debug')('canvas-index')
const EE = require('eventemitter2')

// Database
const Db = require('../db')

// App includes
const BitmapManager = require('./lib/BitmapManager')
const Bitmap = require('./lib/Bitmap')
const BitmapSet = require('./lib/BitmapSet')

// Temporary
const Document = require('../../schemas/Document');

// Schemas
const DOCUMENT_SCHEMAS = {
    // Generic document schema
    default: require('../../schemas/Document').toJSON(),
    // Data abstraction schemas
    file: require('../../schemas/abstr/File').toJSON(),
    tab: require('../../schemas/abstr/Tab').toJSON(),
    note: require('../../schemas/abstr/Note').toJSON()
}


/**
 * Canvas SynapsD
 */

class SynapsD extends EE {


    #db
    #epoch = "e0"   // 2^32 bitmap limit

    constructor(options = {}) {


        debug('Initializing Canvas Index')

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

        if (options.db) {
            this.#db = options.db
        } else {
            // Validate options
            if (!options.path) throw new Error('Database path is required')
            // Initialize the database backend
            this.#db = new Db({
                path: options.path,
                maxDbs: options.maxDbs || 32
            })
        }

        // KV Stores
        this.dbDocuments = this.db.createDataset('documents')
        this.dbBitmaps = this.db.createDataset('bitmaps')

        // Bitmaps
        this.bDocuments = new Bitmap('documents', this.dbDocuments)
        this.bContexts = new BitmapSet(this.dbBitmaps)
        this.bFeatures = new Bitmap('features', this.dbBitmaps)

        /*
        this.tickFeatures(featureArray, id)
        featurerray.forEach(feature => {
            this.bFeatures.tick(feature, id)
        })*/

        //
        // objCleanupQueue
1
        // Indexes
            // Bitmaps
                // Objects

                // Contexts
                // Features

                // Filters
                // Devices
                // Contacts
                // Identities
                // Internals
                    // App
                    // Role
                    // Timeline
                    // Metadata
                    // Tag
            // FTS
            // hash2oid
            //



        this.cleanupQueue = new Bitmap()



        // Main indexes (TODO: Rework)
        this.hash2oid = this.#db.createDataset('hash2oid')

        this.tIndexed2oid = this.#db.createDataset('tIndexed2oid')
        this.tUpdated2oid = this.#db.createDataset('tUpdated2oid')

        // Bitmaps
        // [context]
        // context/uuid #customers
        // context/uuid #customera
        // context/uuid #dev
        // context/uuid #jira-1234

        // []

        // [features]
        // Static set (predefined/hardcoded, not removable)
        // feature/data/abstr/file
        // feature/data/abstr/file/ext/txt
        // feature/data/abstr/contact
        // feature/data/abstr/contact/foo@bar.baz
        // feature/data/abstr/email
        // feature/data/abstr/email/attachment
        // feature/data/abstr/email/flag
        // feature/data/abstr/email/priority/low
        // feature/data/mime/application/pdf
        // feature/data/encoding/utf8
        // feature/data/versions/1.0.0
        // Dynamic set (generated dynamically by the feature extracting functions
        // removed automatically if not used)
        // feature/d/data/abstr/email/somerandomfeature
        this.bitmaps = this.#db.createDataset('bitmaps')


    }


    /**
     * Document management
     */

    insertDocument(doc, contextArray = [], featureArray = []) {

        debug('insertDocument()', doc, contextArray, featureArray)

        // Validate document
        let parsed = this.#validateDocument(doc)
        debug('Document validated', parsed)



        // Add document type to the featureArray if not present
        if (!featureArray.includes(parsed.type)) featureArray.push(parsed.type)



        // Update existing document if already present
        // TODO: Primary hash algo should be set by a config value
        let res = this.hash2oid.get(parsed.hashes.sha1)
        if (res) {
            debug('Document already present, updating..')
            return this.updateDocument(parsed, contextArray, featureArray)
        }

        // Update internal indexes
        let updateHash2oid = this.hash2oid.put(parsed.hashes.sha1, parsed.id)
        let updateUniverse = this.#db.put(parsed.id, parsed)

        // Update bitmaps
        let tickContextArrayBitmaps = this.#tickContextArrayBitmapsSync(contextArray, parsed.id)
        let tickFeatureArrayBitmaps = this.#tickFeatureArrayBitmapsSync(featureArray, parsed.id)

        // Execute in parallel
        Promise.all([
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
            res = this.#db.get(ids[0]); //sync
        } else {
            res = await this.#db.getMany(ids);
        }

        if (cb) { cb(null, res); }
        return res;
    }

    // TODO: Rewrite to support an array of hashes
    getDocumentByHash(hash) {
        let id = this.hash2oid.get(hash)
        if (!id) return null
        return this.#db.get(id)
    }

    async listDocuments(contextArray = [], featureArray = []) {

        debug('listDocuments()', contextArray, featureArray)
        let documents = []

        if (!contextArray.length && !featureArray.length) {
            documents = this.#db.list()
            return documents
        }

        let calculatedContextBitmap = this.contextBitmaps.addMany(contextArray)
        debug('Context IDs', calculatedContextBitmap)

        let calculatedFeatureBitmap = this.featureBitmaps.addMany(featureArray)
        debug('Feature IDs', calculatedFeatureBitmap)

        let result = BitmapManager.addBitmaps([calculatedContextBitmap, calculatedFeatureBitmap])
        debug('Result IDs', result.toArray())

        documents = await this.#db.getMany(result.toArray())
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

    async tickFeatures(featureArray, id) {
        this.#tickFeatureArrayBitmaps(featureArray, id)
    }

    async untickFeatures(featureArray, id) {

    }


    /**
     * Schema management
     */

    listDocumentSchemas() { return DOCUMENT_SCHEMAS; }

    hasDocumentSchema(schema) { return DOCUMENT_SCHEMAS[schema] ? true : false; }

    getDocumentSchema(schema) {
        // TODO: Rework (this ugly workaround [for inconsistent schema names])
        if (schema.includes('/')) schema = schema.split('/').pop()
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


    #validateDocument(doc, schema = DOCUMENT_SCHEMAS['default']) {
        if (typeof doc !== 'object') throw new Error('Document is not an object')
        if (!doc.id) doc.id = this.#genDocumentID()

        // This part needs some love

        let initialized = new Document(doc)
        return initialized
    }

    // Generate a new document ID
    #genDocumentID() {
        let id = this.#db.getKeysCount() + 1000
        return id++
    }

    #tickContextArrayBitmapsSync(bitmapIdArray = [], id) {
        for (const context of bitmapIdArray) {
            debug(`Updating bitmap for context ID "${context}"`);
            this.contextBitmaps.tick(context, id);
        }
    }

    #tickFeatureArrayBitmapsSync(bitmapIdArray = [], id) {
        for (const feature of bitmapIdArray) {
            debug(`Updating bitmap for feature ID "${feature}"`)
            this.featureBitmaps.tick(feature, id)
        }
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

module.exports = SynapsD
