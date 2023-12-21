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
const Tab = require('./schemas/abstr/Tab')

const DOCUMENT_SCHEMAS = {
    default: Document.toJSON(),
    'data/abstr/tab': Tab.toJSON()
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
        if (!document.id) document.id = this.#genDocumentID();

        if (!this.#db.has(document.id)) {
            await this.#db.put(document.id, document);
            await this.#index.hash2oid.put(document.checksum, document.id);
            /*for (const hash of document.hashes) {
                await this.#index.hash2oid.put(hash, document.id);
            }*/
        } else {
            debug(`Document ${document.id} already exists, updating bitmaps`)
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

    updateDocument(doc, contextArray, featureArray, filterArray) {

    }

    deleteDocument(doc, contextArray, featureArray, filterArray) {

    }

    removeDocument(doc, contextArray, featureArray, filterArray) {

    }


    validateDocument(doc) {
        let valid = true;

        if (typeof doc !== 'object') {
            debug(`Document has to be an object, got ${typeof doc}`);
            valid = false;
        }

        if (!doc.type) {
            debug(`Missing document type`);
            valid = false;
        }

        // ...

        return valid
    }

    parseDocument(doc) {
        let parsed = new Tab(doc)
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
        console.log(keyCount)
        let nextDocumentID = INTERNAL_BITMAP_ID_MAX + keyCount + 1
        console.log(nextDocumentID)
        debug(`genDocumentID(): Key count: ${keyCount}`)
        debug(`genDocumentID(): Next document ID: ${nextDocumentID}`)
        return nextDocumentID
    }

}


module.exports = CanvasDB;
