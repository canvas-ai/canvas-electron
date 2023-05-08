'use strict'


// Utils
const debug = require('debug')('canvas-index')

// App includes
const BitmapManager = require('./lib/BitmapManager')
const Bitmap = require('./lib/Bitmap')

// Schemas
const Document = require('./schemas/Document')//.v1.0


/**
 * Canvas Index
 */

class Index {


    #db
    #epoch = "e0"   // TODO

    constructor(db) {

        this.#db = db

        // Main object DB
        this.universe = this.#db.createDataset('documents')

        // In-memory bitmap cache
        this.bitmapCache = new Map()

        // Main indexes (TODO: Rework)
        this.hash2oid = this.#db.createDataset('hash2oid')

        // Current context for bitmap operations
        this.context = new Map()

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

        // Validate document
        let parsed = this.#validateDocument(doc)

        // Document type is a mandatory field, add it to the featureArray if not present
        if (!featureArray.includes(parsed.type)) featureArray.push(parsed.type)
    
        // Update existing document if already present
        let res = this.hash2oid.get(parsed.hashes.sha1) // TODO: Primary hash algo should be set by a config value
        if (res) { 
            debug('Document already present, updating')
            return this.updateDocument(parsed, contextArray, featureArray)
        }    
    
        // Update internal indexes
        let updateHash2oid = this.hash2oid.put(parsed.hashes.sha1, parsed.id)
        let updateUniverse = this.universe.put(parsed.id, parsed)
        
        // Update bitmaps in parallel
        let tickContextArrayBitmaps = this.#tickContextArrayBitmaps(contextArray, parsed.id)
        let tickFeatureArrayBitmaps = this.#tickFeatureArrayBitmaps(featureArray, parsed.id)
        
        await Promise.all([updateHash2oid, updateUniverse, tickContextArrayBitmaps, tickFeatureArrayBitmaps])
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
        let res = []
        if (!contextArray.length && !featureArray.length) {
            res = this.universe.list()
        }

        // Load context bitmaps
        // Load feature bitmaps
        // Get doc ID vect
        // Get IDs from Universe        

        return res
    }

    async removeDocumentByID(id) {
    }

    async removeDocumentByHash(hash) {

    }

    async updateDocument(doc, contextArray = [], featureArray = []) {
        return true
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
     * Filter management
     */

    // Regexp
    // Timeline
    // Metadata


    /**
     * Internal methods
     */


    #validateDocument(doc) {
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
