/**
 * Data abstraction for storing TODO items
 */

const Document = require('../Document')
const DOCUMENT_SCHEMA_VERSION = '2.0'
const DOCUMENT_SCHEMA_TYPE = 'data/abstraction/todo';

class Todo extends Document {

    constructor(params) {
        super({
            ...params,
            checksumDataFields: ['data'],
            type: DOCUMENT_SCHEMA_TYPE,
            schemaVersion: DOCUMENT_SCHEMA_VERSION,
        })

        this.data = params.data || {};
    }

    validate() {
        super.validate();
        if (!this.data.content) {
            throw new Error('TODO content is a mandatory parameter');
        }
    }

    static toJSON() {

        // Get base document as JSON
        let base = super.toJSON();

        // Set schema version and type
        base.checksumDataFields = ['data'];
        base.schemaVersion = DOCUMENT_SCHEMA_VERSION;
        base.type = DOCUMENT_SCHEMA_TYPE;

        return base;
    }

}

module.exports = Todo
