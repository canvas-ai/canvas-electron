
/**
 * Data abstraction for storing browser tab data
 */

const Document = require('../Document')
const DOCUMENT_SCHEMA_VERSION = '2.0'
const DOCUMENT_SCHEMA_TYPE = 'tab';

class Tab extends Document {

    constructor(params) {
        super({
            ...params,
            type: DOCUMENT_SCHEMA_TYPE,
        })

        if (!params.url) {
            throw new Error('Tab URL is a mandatory parameter');
        }

        // Set document defaults
        data.url = params.url
        data.title = params.title || 'Canvas | Tab';

    }

    static toJSON() {

        // Get base document as JSON
        let base = super.toJSON();

        // Set schema version and type
        base.schemaVersion = DOCUMENT_SCHEMA_VERSION;
        base.type = DOCUMENT_SCHEMA_TYPE;

        // Set document data
        base.data.url = 'test';
        base.data.title = 'Canvas | Tab';

        return base;
    }

}

module.exports = Tab
