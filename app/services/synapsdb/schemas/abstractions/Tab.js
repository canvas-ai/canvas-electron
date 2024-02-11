/**
 * Data abstraction for storing browser tab data
 */

const Document = require('../Document')
const DOCUMENT_SCHEMA_VERSION = '2.0'
const DOCUMENT_SCHEMA_TYPE = 'data/abstraction/tab';

class Tab extends Document {

    constructor(params) {
        super({
            ...params,
            dataChecksumFields: ['url'],
            type: DOCUMENT_SCHEMA_TYPE,
            schemaVersion: DOCUMENT_SCHEMA_VERSION,
        })

        this.data = params.data || {};

    }

    validate() {
        super.validate();
        if (!this.data.url) {
            throw new Error('Tab URL is a mandatory parameter');
        }
    }

    static toJSON() {

        // Get base document as JSON
        let base = super.toJSON();

        // Set schema version and type
        base.checksumDataFields = ['url'];
        base.schemaVersion = DOCUMENT_SCHEMA_VERSION;
        base.type = DOCUMENT_SCHEMA_TYPE;

        // Set document data
        base.data.url = 'https://getcanvas.org/';
        base.data.title = 'Canvas | GetCanvas.org';

        return base;
    }

}

module.exports = Tab
