// Utils
const debug = require('debug')('@canvas:db')
const EE = require('eventemitter2')

// Backend
const Db = require('./backends/lmdb')

// App includes
const Index = require('./index/index.js')

// Schemas
const documentSchemas = require('./schemas/registry.js')
const { de, th, ca } = require('date-fns/locale')

// Constants
const INTERNAL_BITMAP_ID_MIN = 1000
const INTERNAL_BITMAP_ID_MAX = 1000000


/**
 * Canvas document database
 */

class SynapsDB extends EE {

    #db;

    constructor(
        options = {
            backupOnOpen: false,    // Backup database on open
            backupOnClose: false,   // Backup database on close
            compression: true,      // Enable compression
            eventEmitter: {},       // Event emitter options, probably not needed
        }
    ) {
        // Event emitter
        super(options.eventEmitter);

        // Initialize database backend
        if (!options.path) throw new Error("Database path required");
        this.#db = new Db(options);

        // Initialize internal datasets
        this.index = new Index({
            db: this.#db.createDataset("index"),
            eventEmitter: options.eventEmitter
        });

        // Initialize documents dataset
        this.documents = this.#db.createDataset("documents");

        // Initialize datasets
        this.datasets = new Map();
    }


    /**
     * Generic search / query interface
     */

    // Search documents based on document fields
    async search(
        query,
        contextArray,
        featureArray,
        filterArray,
        metaOnly = false
    ) {}

    // Find documents based on query
    async find(
        query,
        contextArray,
        featureArray,
        filterArray,
        metaOnly = false
    ) {}


    /**
     * Document interface
     */

    /**
     * Retrieves a document by its ID.
     * @param {string} id - The ID of the document.
     * @returns {object} - The document object.
     * @throws {Error} - If the document ID is not provided.
     */
    getDocumentById(id) {
        if (!id) throw new Error("Document ID required");
        return this.documents.get(id);
    }

    /**
     * Retrieves a document by its hash.
     * @param {string} hash - The hash of the document.
     * @returns {object|null} - The document object if found, or null if not found.
     * @throws {Error} - If the document hash is not provided or is not a string.
     */
    getDocumentByHash(hash) {
        if (!hash) throw new Error("Document hash required");
        if (typeof hash !== "string") throw new Error("Document hash has to be a string");
        let id = this.index.hash2oid.get(hash);
        if (!id) return null;
        return this.documents.get(id);
    }

    // TODO: Remove or refactor
    async listDocuments(
        contextArray = [],
        featureArray = [],
        filterArray = []
    ) {
        return this.getDocuments(contextArray, featureArray, filterArray, true);
    }

    // TODO: Remove or refactor
    async getDocuments(
        contextArray = [],
        featureArray = [],
        filterArray = [],
        metaOnly = false    // Return only metadata, maybe split to listDocuments() and getDocuments()
    ) {
        debug(`getDocuments(): ContextArray: ${contextArray}; FeatureArray: ${featureArray}`);

        let documents = [];
        let bitmaps = [];

        if (!contextArray.length && !featureArray.length) {
        debug("No context or feature array, returning all documents");
        documents = await this.documents.listValues();
        return documents;
        }

        /**
         * TODO: Most of this logic has to be moved to the index!!
         */

        if (contextArray.length) {
        debug("Adding context bitmaps to AND operation");
        bitmaps.push(this.index.contextArrayAND(contextArray));
        }

        if (featureArray.length) {
        debug("Adding feature bitmaps to AND operation");
        bitmaps.push(this.index.featureArrayAND(featureArray));
        }

        if (bitmaps.length === 0) {
        debug("No bitmaps to AND, returning an empty array");
        return [];
        }

        let result = this.index.bitmapAND(bitmaps);
        debug("Result IDs", result.toArray());
        if (!result.toArray().length) return [];

        documents = await this.documents.getMany(result.toArray());
        return documents;
    }

    /**
     * Retrieves multiple documents by their IDs.
     * @param {Array} idArray - An array of document IDs.
     * @param {boolean} [metaOnly=false] - Flag indicating whether to retrieve only the document metadata.
     * @returns {Promise<Array|Object>} - A promise that resolves to an array of documents or document metadata.
     * @throws {Error} - If idArray is not an array or is empty.
     */
    async getDocumentsByIdArray(idArray, metaOnly = false) {
        if (!Array.isArray(idArray) || idArray.length < 1) {
            throw new Error("Array of document IDs required");
        }

        return this.documents.getMany(idArray);
        /* const documents = await this.documents.getMany(idArray);
        if (metaOnly) {
            return documents.map(doc => ({
                id: doc.id,
                meta: doc.meta
            }));
        }
        return documents;
        */
    }

    /**
     * Retrieves documents by an array of document hashes.
     * @param {string[]} hashArray - Array of document hashes.
     * @param {boolean} [metaOnly=false] - Flag indicating whether to retrieve only metadata.
     * @returns {Promise<any>} - A promise that resolves to the retrieved documents.
     * @throws {Error} - If the input is not a valid array of document hashes.
     */
    async getDocumentsByHashArray(hashArray, metaOnly = false) {
        if (!Array.isArray(hashArray) || hashArray.length < 1) {
            throw new Error("Array of document hashes required");
        }

        const idArray = hashArray
            .map(hash => this.index.hash2oid.get(hash))
            .filter(id => id !== undefined);

        return this.getDocumentsByIdArray(idArray, metaOnly);
    }

    /**
     * Inserts a document into the database.
     *
     * @param {Object} document - The document to be inserted.
     * @param {Array} [contextArray=[]] - An array of context values.
     * @param {Array} [featureArray=[]] - An array of feature values.
     * @param {Array} [filterArray=[]] - An array of filter values.
     * @returns {string} - The ID of the inserted document.
     * @throws {Error} - If the document is invalid or if there is an error inserting it into the database.
     */
    async insertDocument(document, contextArray = [], featureArray = [], filterArray = []) {
        debug(`insertDocument(): ContextArray: ${contextArray}; FeatureArray: ${featureArray}`);

        // Validate document
        if (!this.#validateDocument(document)) throw new Error('Failed to validate document');

        // Parse document
        const parsed = await this.#parseDocument(document);
        if (!parsed) throw new Error('Failed to parse document');

        // Check if document already exists based on its checksum
        if (this.index.hash2oid.has(parsed.checksum)) {
            let existingDocument = this.getDocumentByHash(parsed.checksum);
            debug(`Document hash ${parsed.checksum} already found in the database, updating exiting record: ${existingDocument.checksum}/${existingDocument.id}`);
            parsed.id = existingDocument.id;
        } else {
            debug(`Inserting new document into the database index: ${parsed.checksum} -> ${parsed.id}`);
            try {
                await this.index.hash2oid.db.put(parsed.checksum, parsed.id);
            } catch (error) {
                throw new Error(`Error inserting document into the hash2oid index: ${error.message}`);
            }
        }

        try {
            debug(`Inserting document into the database: ${parsed.id}`)
            await this.documents.put(parsed.id, parsed);
        } catch (error) {
            throw new Error(`Error inserting document to the database: ${error.message}`);
        }

        // Extract document features (to-be-moved to parseDocument() method)
        const documentFeatures = this.#extractDocumentFeatures(parsed);
        const combinedFeatureArray = [...featureArray, ...documentFeatures];

        // Update bitmaps
        // By default we leave the old bitmaps in place, moving documents between contexts
        // and adding/removing features should be handled via the respective methods
        // Maybe we should add a flag to remove old bitmaps
        // TODO: Refactor
        if (Array.isArray(contextArray) && contextArray.length > 0) {
            await this.index.updateContextBitmaps(contextArray, parsed.id);
        }

        // TODO: Refactor
        if (Array.isArray(combinedFeatureArray) && combinedFeatureArray.length > 0) {
            await this.index.updateFeatureBitmaps(combinedFeatureArray, parsed.id);
        }

        return parsed.id;
    }

    async insertDocumentArray(documentArray, contextArray = [], featureArray = [], filterArray = []) {
        debug(`insertDocumentArray(): ContextArray: ${contextArray}; FeatureArray: ${featureArray}`);

        if (!Array.isArray(documentArray) || documentArray.length < 1) {
            throw new Error("Document array required");
        }

        let result = [];
        let errors = [];

        // TODO: Refactor to use Promise.all() and lmdb batch operations
        for (const doc of documentArray) {
            try {
                const id = await this.insertDocument(doc, contextArray, featureArray, filterArray);
                result.push(id);
            } catch (error) {
                errors.push(error.message);
            }
        }

        if (errors.length > 0) {
            throw new Error(`Errors inserting documents: ${errors.join("; ")}`);
        }

        return result;
    }


    async updateDocument(document, contextArray = [], featureArray = [], filterArray = []) {
        return this.insertDocument(document, contextArray, featureArray, filterArray);
        /*debug(`updateDocument(): ContextArray: ${contextArray}; FeatureArray: ${featureArray}`);
        if (!document.id) throw new Error("Document ID parameter is mandatory");
        if (!this.documents.has(document.id)) throw new Error(`Document with ID ${document.id} not found`);

        // Validate new document
        if (!this.#validateDocument(document)) throw new Error('Failed to validate document');

        // Parse new document
        const parsed = await this.#parseDocument(document);
        if (!parsed) throw new Error('Invalid document supplied');

        // Retrieve old document
        const oldDocument = this.documents.get(document.id);

        // Update checksums
        if (oldDocument.checksum !== parsed.checksum) {
            // TODO: Refactor to use lmdb batch operations
            // TODO: Add propper error handling
            try {
                await this.index.hash2oid.put(parsed.checksum, parsed.id);
                await this.index.hash2oid.del(oldDocument.checksum);
            } catch (error) {
                throw new Error(`Error updating hash2oid index: ${error.message}`);
            }
        }

        // Update document
        // TODO: Increase revision/version count, implement propper versioning on the LMDB level
        try {
            await this.documents.put(document.id, parsed);
        } catch (error) {
            throw new Error(`Error updating document: ${error.message}`);
        }

        // Update bitmaps
        // By default we leave the old bitmaps in place, moving documents between contexts
        // and adding/removing features should be handled via the respective methods
        // Maybe we should add a flag to remove old bitmaps

        // Extract document features (to-be-moved to parseDocument() method)
        const documentFeatures = this.#extractDocumentFeatures(parsed);
        const combinedFeatureArray = [...featureArray, ...documentFeatures];

        // TODO: Refactor
        if (Array.isArray(contextArray) && contextArray.length > 0) {
            await this.index.updateContextBitmaps(contextArray, parsed.id);
        }

        // TODO: Refactor
        if (Array.isArray(combinedFeatureArray) && combinedFeatureArray.length > 0) {
            await this.index.updateFeatureBitmaps(combinedFeatureArray, parsed.id);
        }

        return parsed.id;*/

    }

    async updateDocumentArray(documentArray, contextArray = [], featureArray = [], filterArray = []) {
        debug(`updateDocumentArray(): ContextArray: ${contextArray}; FeatureArray: ${featureArray}`);

        if (!Array.isArray(documentArray) || documentArray.length < 1) {
            throw new Error("Document array required");
        }

        let result = [];
        let errors = [];

        // TODO: Refactor to use Promise.all() and lmdb batch operations
        for (const doc of documentArray) {
            try {
                const id = await this.updateDocument(doc, contextArray, featureArray, filterArray);
                result.push(id);
            } catch (error) {
                errors.push(error.message);
            }
        }

        if (errors.length > 0) {
            throw new Error(`Errors updating documents: ${errors.join("; ")}`);
        }

        return result;
    }

    async deleteDocument(id) {
        // We are not removing the entry, just updating meta: {} to mark it as deleted
        // We also clear all bitmaps, tick the "removed" bitmap and remove the data: {} part
        debug(`deleteDocument(): ID: ${id}`);
        if (!id) throw new Error("Document ID required");

        let document = this.documents.get(id);
        if (!document) return false;

        // Clear bitmaps

    }

    async deleteDocumentArray(idArray) {}


    /**
     * Bitmap methods
     */


    async removeDocument(id, contextArray, featureArray, filterArray) {
        debug(`removeDocument(): ID: ${id}; ContextArray: ${contextArray}; FeatureArray: ${featureArray}`);
        if (!id) throw new Error("Document ID required");
        if (!contextArray || !Array.isArray(contextArray) || contextArray.length < 1 ) throw new Error("Context array required");

        let document = this.documents.get(id);
        if (!document) return false;

        await this.index.untickContextArray(contextArray, document.id);
        if (Array.isArray(featureArray) && featureArray.length > 0) {
            await this.index.untickFeatureArray(featureArray, document.id);
        }
    }

    async removeDocumentArray(idArray, contextArray, featureArray, filterArray) {
        debug(`removeDocumentArray(): IDArray: ${idArray}; ContextArray: ${contextArray}; FeatureArray: ${featureArray}`);
        if (!Array.isArray(idArray) || idArray.length < 1) throw new Error("Array of document IDs required");

    }


    /**
     * Utils
     */

    /**
     * Retrieves a list of document schemas.
     * @returns {Array} The list of document schemas.
     */
    listDocumentSchemas() {
        return documentSchemas.list();
    }

    /**
     * Retrieves the document schema based on the provided schema name.
     * @param {string} schema - The name of the schema to retrieve.
     * @returns {object} - The document schema object.
     */
    getDocumentSchema(schema) {
        return documentSchemas.getSchema(schema);
    }

    // TODO: Remove or refactor
    createDataset(name) {
        if (this.datasets.has(name)) return this.datasets.get(name);
        let dataset = this.#db.createDataset(name);
        this.datasets.set(name, dataset);
        return dataset;
    }

    //deleteDataset(name) { }


    /**
     * Internal methods
     */

    async #parseDocument(doc) {
        debug("Parsing document");
        let Schema = this.getDocumentSchema(doc.type);
        let parsed = new Schema(doc);

        if (!parsed.id) {
            debug('Generating document ID');
            parsed.id = await this.#genDocumentID();
        }

        if (!parsed.checksum) {
            debug('Generating document checksum');
            parsed.checksum = parsed.calculateChecksum();
        }

        if (!parsed.meta) {
            debug(`Missing document metadata`);
            return false;
        }

        debug("Document parsed");
        debug(parsed);
        return parsed;
    }

    #validateDocument(doc) {
        debug("Validating document " + JSON.stringify(doc, null, 2));

        if (typeof doc !== "object") {
            debug(`Document has to be an object, got ${typeof doc}`);
            return false;
        }

        if (!doc.type) {
            debug(`Missing document type`);
            return false;
        }

        if (!this.getDocumentSchema(doc.type)) {
            debug(`Invalid document type: ${doc.type}`);
            return false;
        }

        if (!doc.data) {
            debug(`Missing document data`);
            return false;
        }

        debug("Document is valid");
        return true;
    }

    #extractDocumentFeatures(doc) {
        let features = [];
        // TODO, currently we just add the document type
        features.push(doc.type);
        return features;
    }

    async #genDocumentID() {
        const keyCount = await this.documents.getKeysCount() || 0;
        const nextDocumentID = INTERNAL_BITMAP_ID_MAX + keyCount + 1;
        debug(`Generating new document ID, current key count: ${keyCount}, doc ID: ${nextDocumentID}`);
        return nextDocumentID;
    }
}


module.exports = SynapsDB;
