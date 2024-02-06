// Utils
const Db = require('../../utils/db')
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
const Note = require('./schemas/abstractions/Note')
const Todo = require('./schemas/abstractions/Todo')
const File = require('./schemas/abstractions/File')

const DOCUMENT_SCHEMAS = {
    default: Document,
    'data/abstraction/tab': Tab,
    'data/abstraction/note': Note,
    'data/abstraction/todo': Todo,
    'data/abstraction/file': File
}


/**
 * Canvas document database
 */

class CanvasDB extends EE {

    #db;

    constructor(options = {
        backupOnOpen: false,    // Backup database on open
        backupOnClose: false,   // Backup database on close
        compression: true,      // Enable compression
        ee: {}                  // Event emitter options, probably not needed
    }) {
        // Initialize event emitter
        super(options.ee)

        // Initialize database backend
        if (!options.path) throw new Error('Database path required');
        this.#db = new Db(options);

        // Initialize internal datasets
        this.index = new Index({
            db: this.#db.createDataset('index')
        })

        this.documents = this.#db.createDataset('documents')

        // Initialize datasets
        this.datasets = new Map()
    }


    /**
     * Generic search / query interface
     */

    // Search documents based on document fields
    async searchDocuments(query, contextArray, featureArray, filterArray, metaOnly = false) {}

    // Find documents based on query
    async findDocuments(query, contextArray, featureArray, filterArray, metaOnly = false) {}


    /**
     * Document interface
     */

    getDocumentById(id) {
        if (!id) throw new Error('Document ID required')
        return this.documents.get(id)
    }

    getDocumentByHash(hash) {
        if (!hash) throw new Error('Document hash required')
        let id = this.index.hash2oid.get(hash)
        if (!id) return null
        return this.documents.get(id)
    }

    async getDocuments(contextArray, featureArray, filterArray, metaOnly = false) {
        debug(`getDocuments(): ContextArray: ${contextArray}; FeatureArray: ${featureArray}`)

        let documents = []
        let bitmaps = []

        if (!contextArray.length && !featureArray.length) {
            documents = await this.documents.listValues()
            return documents
        }

        if (contextArray.length) {
            bitmaps.push(this.index.contextArrayAND(contextArray))
        }

        if (featureArray.length) {
            bitmaps.push(this.index.featureArrayAND(featureArray))
        }

        if (bitmaps.length === 0) return []

        let result = this.index.AND(bitmaps)
        debug('Result IDs', result.toArray())
        if (!result.toArray().length) return []

        documents = await this.documents.getMany(result.toArray())
        return documents
    }

    async getDocumentsByIdArray(idArray, metaOnly = false) {

    }


    async getDocumentsByHashArray(hashArray, metaOnly = false) {

    }

    // TODO: Refactor, this is a legacy method
    async insertDocument(document, contextArray, featureArray, filterArray) {

        if (!this.validateDocument(document)) throw new Error('Invalid document');
        document = this.parseDocument(document);

        let documentFeatures = this.#extractDocumentFeatures(document);
        featureArray = [...featureArray, ...documentFeatures]

        debug('Inserting document ' + JSON.stringify(document, null, 2))
        debug(`ContextArray: ${contextArray}; FeatureArray: ${featureArray}`)

        if (!this.index.hash2oid.has(document.checksum)) {
            debug(`Inserting document ID ${document.id} to DB, document checksum: ${document.checksum}`)
            await this.documents.put(document.id, document);
            await this.index.hash2oid.put(document.checksum, document.id);
        } else {
            debug(`Document ID ${document.id} already exists, updating bitmaps`)
        }

        if (Array.isArray(contextArray) && contextArray.length > 0) {
            await this.index.updateContextBitmaps(contextArray, document.id)
        }

        if (Array.isArray(featureArray) && featureArray.length > 0) {
            await this.index.updateFeatureBitmaps(featureArray, document.id)
        }
    }

    // TODO: Refactor to use LMDB's batch operations instead
    async insertDocumentArray(docArray, contextArray, featureArray, filterArray) {
        for (const document of docArray) {
            await this.insertDocument(document, contextArray, featureArray, filterArray);
        }
    }

    async updateDocument(document, contextArray, featureArray, filterArray) {
        // TODO: Temporary
        return this.insertDocument(document, contextArray, featureArray, filterArray)
    }

    async updateDocumentArray(documentArray, contextArray, featureArray, filterArray) {

    }

    async deleteDocument(id) {
        // We are not removing the entry, just updating meta: {} to mark it as deleted
        // We also clear all bitmaps, tick the "removed" bitmap and remove the data: {} part
    }

    async deleteDocumentArray(idArray) {

    }


    /**
     * Bitmap methods
     */

    async addDocumentFeatures(id, featureArray) {}

    async removeDocumentFeatures(id, featureArray) {}

    async addDocumentContexts(id, contextArray) {}

    async removeDocumentContexts(id, contextArray) {}

    // TODO: To be removed
    async removeDocument(id, contextArray, featureArray, filterArray) {
        debug(`removeDocument(): ID: ${id}; ContextArray: ${contextArray}; FeatureArray: ${featureArray}`)
        if (!id) throw new Error('Document ID required')
        if (!contextArray || !Array.isArray(contextArray) || contextArray.length < 1) throw new Error('Context array required')

        let document = this.documents.get(id)
        if (!document) return false

        await this.index.untickContextArray(contextArray, document.id)
        if (Array.isArray(featureArray) && featureArray.length > 0) {
            await this.index.untickFeatureArray(featureArray, document.id)
        }
    }


    /**
     * Utils
     */

    // TODO: Refactor
    listDocumentSchemas() {
        // Return the keys of DOCUMENT_SCHEMAS
        return Object.keys(DOCUMENT_SCHEMAS)
    }

    // TODO: Refactor
    getDocumentSchema(schema) {
        // If schema does not contain slashes, prepend "data/abstraction/" to it
        if (schema.indexOf('/') === -1) schema = 'data/abstraction/' + schema;
        return DOCUMENT_SCHEMAS[schema] || DOCUMENT_SCHEMAS['default'];
    }

    // TODO: Remove or refactor
    createDataset(name) {
        if (this.datasets.has(name)) return this.datasets.get(name)
        let dataset = this.#db.createDataset(name)
        this.datasets.set(name, dataset)
        return dataset
    }


    /**
     * Internal methods
     */

    #parseDocument(doc) {
        debug('Parsing document')
        let Schema = this.getDocumentSchema(doc.type)
        let parsed = new Schema(doc)
        if (!parsed.id) parsed.id = this.#genDocumentID();
        return parsed
    }

    #validateDocument(doc) {
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

    #extractDocumentFeatures(doc) {
        let features = []
        // TODO, currently we just add the document type
        features.push(doc.type)
        return features
    }

    #genDocumentID() {
        const keyCount = this.documents.getKeysCount() || 0
        const nextDocumentID = INTERNAL_BITMAP_ID_MAX + keyCount + 1
        debug(`Generating new document ID, current key count: ${keyCount}, doc ID: ${nextDocumentID}`)
        return nextDocumentID
    }

}


module.exports = CanvasDB;
