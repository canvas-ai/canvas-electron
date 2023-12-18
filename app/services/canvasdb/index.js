// Utils
const debug = require('debug')('canvas-db')
const EE = require('eventemitter2')

// App includes
const Index = require('./index')


/**
 * Canvas document database
 */

class Db extends EE {


    #documents;
    #index;

    constructor(options = {
        db: null,
        index: null
    }) {

        // Initialize event emitter
        super()

        // Initialize database backend
        this.#documents = options.db;

        // Initialize index
        this.#index = new Index({
            db: options.index
        })

    }

    async insertDocument(doc, contextArray, featureArray, filterArray) {
        let validated = await this.#validateDocument(doc);
        if (!validated) return false;


        await this.#documents.put(validated.id, validated);

        validated.hash.forEach((hash)  => {
            this.#index.hash2oid.set(hash, validated.id);
        });

        if (Array.isArray(contextArray) && contextArray.length > 0) {
            await this.#index.updateContextBitmaps(contextArray, validated.id)
        }

        if (Array.isArray(featureArray) && featureArray.length > 0) {
            await this.#index.updateFeatureBitmaps(featureArray, validated.id)
        }
    }

    async insertDocumentArray(docArray, contextArray, featureArray, filterArray) {
        for (const doc of docArray) {
            await this.insertDocument(doc, contextArray, featureArray, filterArray);
        }
    }

    async listDocuments(contextArray, featureArray, filterArray) {
        let docArray = [];

        // Calculate bitmaps
        let contextBitmap = await this.#index.idArrayAND(contextArray);
        let featureBitmap = await this.#index.idArrayOR(featureArray);
        let resultBitmap = await this.#index.bitmapArrayAND(contextBitmap, featureBitmap);

        // Get document IDs
        let oidArray = resultBitmap.toArray();

        // Get documents
        docArray = await this.#documents.getMany(oidArray);

        return docArray;
    }

    updateDocument(doc, contextArray, featureArray, filterArray) {

    }

    deleteDocument(doc, contextArray, featureArray, filterArray) {

    }

    removeDocument(doc, contextArray, featureArray, filterArray) {

    }


    async #validateDocument(doc) {
        if (typeof doc !== 'object') throw new Error('Document is not an object')
        if (!doc.type) throw new Error('Document type is not defined')

        // TODO: Validate document
        doc.id = this.#genDocumentID()
        return doc
    }

    async #extractDocumentFeatures(doc) {
        let features = []
        // TODO
        features.push(doc.type)
        return features
    }

    #genDocumentID() {
        let keysCount = this.documents.db.getKeysCount()
        let id = INTERNAL_BITMAP_ID_MAX + keysCount + 1
        if (id > MAX_DOCUMENTS) throw new Error('Maximum number of documents reached')
        return id
    }

}


module.exports = Db;
