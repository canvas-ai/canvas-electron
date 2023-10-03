/**
 * Data abstraction for storing Notes
 */

const Document = require('../Document')
const DOCUMENT_SCHEMA_VERSION = '2.0'
const DOCUMENT_SCHEMA_TYPE = 'note';

class Note extends Document {

    constructor(params) {
        super({
            ...params,
            type: DOCUMENT_SCHEMA_TYPE,
        })

        if (!params.content) {
            throw new Error('Note content is a mandatory parameter');
        }

        // Set document defaults
        data.title = params.title || 'Canvas | Note';
        data.content = params.content || 'Note content';
    }

    static toJSON() {

        // Get base document as JSON
        let base = super.toJSON();

        // Set schema version and type
        base.schemaVersion = DOCUMENT_SCHEMA_VERSION;
        base.type = DOCUMENT_SCHEMA_TYPE;

        // Set document data
        base.data.title = 'Canvas | Note';
        base.data.content = 'Note content';

        return base;
    }

}

module.exports = Note;
