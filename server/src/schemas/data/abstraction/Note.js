const BaseDocument = require('../BaseDocument.js');

const DOCUMENT_SCHEMA = 'data/abstraction/note';
const DOCUMENT_SCHEMA_VERSION = '2.0';
const DOCUMENT_DATA_TYPE = 'application/json';
const DOCUMENT_DATA_ENCODING = 'utf8';

class Note extends BaseDocument {
    constructor(options = {}) {
        super({
            schema: DOCUMENT_SCHEMA,
            schemaVersion: DOCUMENT_SCHEMA_VERSION,
            index: {
                primaryChecksumAlgorithm: 'sha1',
                primaryChecksumFields: ['data.title', 'data.content'],
                searchFields: ['data.title', 'data.content'],
                embeddingFields: ['data.title', 'data.content'],
                ...options.index,
            },
            metadata: {
                dataContentType: DOCUMENT_DATA_TYPE,
                dataContentEncoding: DOCUMENT_DATA_ENCODING,
                ...options.meta,
            },
            ...options,
        });
    }
}

module.exports = Note;
