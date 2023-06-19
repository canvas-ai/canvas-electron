
/**
 * Data abstraction to store browser tab data
 */

const Document = require('../../Document')
const DOCUMENT_SCHEMA_VERSION = '2.0'
const DOCUMENT_SCHEMA_TYPE = 'tab';

class Tab extends Document {

    constructor(params) {
        super({
            ...params,
            type: DOCUMENT_SCHEMA_TYPE,
        })

        // Set document defaults
        data.url = params.url || null;
        data.title = params.title || null;
    }

    static toJSON() {

        // Get base document as JSON
        let base = super.toJSON();

        // Set schema version and type
        base.schemaVersion = DOCUMENT_SCHEMA_VERSION;
        base.type = DOCUMENT_SCHEMA_TYPE;
        base.data = {
            url: null,
            title: null,
        }

        return base;
    }

}

module.exports = Tab
