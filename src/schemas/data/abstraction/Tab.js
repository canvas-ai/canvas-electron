const BaseDocument = require('../BaseDocument.js');

const DOCUMENT_SCHEMA = 'data/abstraction/tab';
const DOCUMENT_SCHEMA_VERSION = '2.0';
const DOCUMENT_DATA_TYPE = 'application/json';
const DOCUMENT_DATA_ENCODING = 'utf8';

class Tab extends BaseDocument {

    constructor(options = {}) {
        super({
            schema: DOCUMENT_SCHEMA,
            schemaVersion: DOCUMENT_SCHEMA_VERSION,
            index: {
                primaryChecksumAlgorithm: 'sha1',
                primaryChecksumFields: ['data.url'],
                fullTextIndexFields: ['data.url', 'data.title'],
                embeddingFields: ['data.title'],
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

module.exports = Tab;
