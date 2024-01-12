// Utils
const debug = require('debug')('canvas-db')
const EE = require('eventemitter2')

// App includes
const Index = require('./index/')   // TODO: Refactor

// Constants
const INTERNAL_BITMAP_ID_MIN = 1000
const INTERNAL_BITMAP_ID_MAX = 1000000

// Schemas
const Document = require('./schemas/Document')
const Tab = require('./schemas/abstractions/Tab')

const DOCUMENT_SCHEMAS = {
    default: Document.toJSON(),
    'data/abstraction/tab': Tab.toJSON()
}


/**
 * Canvas document database
 */

class CanvasDB extends EE {

    #db;
    #index;

    constructor(options = {
        db: null,
        index: null
    }) {

        // Initialize event emitter
        super()

        // Initialize database backend
        this.#db = options.db;

        // Initialize index
        this.#index = new Index({
            db: options.index
        })

    }

    async insertDocument(document, contextArray, featureArray, filterArray) {

        if (!this.validateDocument(document)) throw new Error('Invalid document');
        document = this.parseDocument(document);

        let documentFeatures = await this.#extractDocumentFeatures(document);
        featureArray = [...featureArray, ...documentFeatures]

        debug('Inserting document ' + JSON.stringify(document, null, 2))
        debug(`ContextArray: ${contextArray}; FeatureArray: ${featureArray}`)

        if (!this.#index.hash2oid.has(document.checksum)) {
            debug(`Inserting document ID ${document.id} to DB, document checksum: ${document.checksum}`)
            await this.#db.put(document.id, document);
            await this.#index.hash2oid.put(document.checksum, document.id);
        } else {
            debug(`Document ID ${document.id} already exists, updating bitmaps`)
        }

        if (Array.isArray(contextArray) && contextArray.length > 0) {
            await this.#index.updateContextBitmaps(contextArray, document.id)
        }

        if (Array.isArray(featureArray) && featureArray.length > 0) {
            await this.#index.updateFeatureBitmaps(featureArray, document.id)
        }
    }

    async insertDocumentArray(docArray, contextArray, featureArray, filterArray) {
        for (const document of docArray) {
            await this.insertDocument(document, contextArray, featureArray, filterArray);
        }
    }

    async listDocuments(contextArray, featureArray, filterArray) {
        debug(`listDocuments(): ContextArray: ${contextArray}; FeatureArray: ${featureArray}`)

        let documents = []
        let bitmaps = []

        if (!contextArray.length && !featureArray.length) {
            documents = await this.#db.listValues()
            return documents
        }

        if (contextArray.length) {
            bitmaps.push(this.#index.contextArrayAND(contextArray))
        }

        if (featureArray.length) {
            bitmaps.push(this.#index.featureArrayAND(featureArray))
        }

        if (bitmaps.length === 0) return []

        let result = this.#index.AND(bitmaps)
        debug('Result IDs', result.toArray())
        if (!result.toArray().length) return []

        documents = await this.#db.getMany(result.toArray())
        return documents

    }

    async updateDocument(doc, contextArray, featureArray, filterArray) {}

    async removeDocument(id, contextArray, featureArray, filterArray) {
        debug(`removeDocument(): ID: ${id}; ContextArray: ${contextArray}; FeatureArray: ${featureArray}`)
        if (!id) throw new Error('Document ID required')
        if (!contextArray || !Array.isArray(contextArray) || contextArray.length < 1) throw new Error('Context array required')

        let document = await this.#db.get(id)
        if (!document) return false


        let res = this.#index.untickContextArray(contextArray, document.id)

        if (Array.isArray(featureArray) && featureArray.length > 0) {
            await this.#index.untickFeatureArray(featureArray, document.id)
        }

    }

    async deleteDocument(id) {
        // We are not removing the entry, just updating meta: {} to mark it as deleted
        // We also clear all bitmaps, tick "removed" bitmap and remove the data: {} part
    }

    validateDocument(doc) {
        debug('Validating document ' + JSON.stringify(doc, null, 2))

        if (typeof doc !== 'object') {
            debug(`Document has to be an object, got ${typeof doc}`);
            return false;
        }

        if (!doc.type) {
            debug(`Missing document type`);
            return false;
        }

        // ...

        return true
    }

    parseDocument(doc) {
        debug('Parsing document')
        // TODO Tab.parse(doc)
        let parsed = new Tab(doc)
        if (!parsed.id) parsed.id = this.#genDocumentID();
        return parsed
    }

    getDocumentSchema(schema) {
        if (!DOCUMENT_SCHEMAS[schema]) {
            debug(`getDocumentSchema(): Schema ${schema} not found, using default`)
            return DOCUMENT_SCHEMAS['default']
        }

        return DOCUMENT_SCHEMAS[schema]
    }

    async #extractDocumentFeatures(doc) {
        let features = []
        // TODO, currently we just add the document type
        features.push(doc.type)
        return features
    }

    #genDocumentID() {
        let keyCount = this.#db.getKeysCount() || 0
        let nextDocumentID = INTERNAL_BITMAP_ID_MAX + keyCount + 1
        debug(`Generating new document ID, current key count: ${keyCount}, ID: ${nextDocumentID}`)
        return nextDocumentID
    }

}


module.exports = CanvasDB;
