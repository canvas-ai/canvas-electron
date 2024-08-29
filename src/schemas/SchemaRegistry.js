const fs = require('fs');
const path = require('path');

const SCHEMA_TYPES = [
    'data/abstraction',
    'internal',
    'transport',
];

class SchemaRegistry {

    constructor(schemasDir = process.cwd()) {
        this.schemasDir = schemasDir;
        this.schemas = new Map();
        this.initialized = true;
        //this.loadSchemas(); // lets not waste time and let require handle this
        this.schemas.set('data/abstraction/document', require('./data/abstraction/Document'));
        this.schemas.set('data/abstraction/file', require('./data/abstraction/File'));
        this.schemas.set('data/abstraction/note', require('./data/abstraction/Note'));
        this.schemas.set('data/abstraction/tab', require('./data/abstraction/Tab'));
        this.schemas.set('data/abstraction/todo', require('./data/abstraction/Todo'));
        this.schemas.set('transport/response', require('./transport/ResponseObject'));
    }

    getSchema(name) {
        if (!this.initialized) { throw new Error('SchemaRegistry not initialized'); }
        if (!this.schemas.has(name)) { throw new Error(`Schema not found: ${name}`); }
        return this.schemas.get(name);
    }

    hasSchema(name) {
        if (!this.initialized) { throw new Error('SchemaRegistry not initialized'); }
        return this.schemas.has(name);
    }

    listSchemas() {
        if (!this.initialized) { throw new Error('SchemaRegistry not initialized'); }
        let schemas = [];
        for (const [key, schema] of this.schemas) {
            schemas.push(key);
        }
        return schemas;
    }

    loadSchemas() {
        for (const schemaType of SCHEMA_TYPES) {
            const fullPath = path.join(this.schemasDir, schemaType);
            const files = fs.readdirSync(fullPath);

            for (const file of files) {
                if (file.endsWith('.js')) {
                    const schemaName = path.basename(file, '.js');
                    const schemaPath = path.join(fullPath, file);
                    const schema = require(schemaPath);
                    const key = `${schemaType}/${schemaName.toLowerCase()}`;
                    this.schemas.set(key, schema);
                }
            }
        }
        this.initialized = true;
    }

}

module.exports = SchemaRegistry;
