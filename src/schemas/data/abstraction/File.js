const BaseDocument = require('../BaseDocument.js');

const DOCUMENT_SCHEMA = 'data/abstraction/file';
const DOCUMENT_SCHEMA_VERSION = '2.0';
const DOCUMENT_DATA_TYPE = 'application/octet-stream';
const DOCUMENT_DATA_ENCODING = 'utf8';

class File extends BaseDocument {
    constructor(options = {}) {
        super({
            schema: DOCUMENT_SCHEMA,
            schemaVersion: DOCUMENT_SCHEMA_VERSION,
            index: {
                primaryChecksumAlgorithm: 'sha1',
                primaryChecksumFields: [],
                searchFields: ['paths'],
                embeddingFields: [],
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

module.exports = File;
