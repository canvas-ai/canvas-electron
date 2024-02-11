class SchemaRegistry {
    constructor() {
        this.schemas = {
            default: require('./Document'),
        };
    }

    registerSchema(key, schema) {
        this.schemas[key] = schema;
    }

    getSchema(key) {
        return this.schemas[key] || this.schemas.default;
    }

    list() {
        return Object.keys(this.schemas);
    }
}

// Singleton
const schemaRegistry = new SchemaRegistry();

// Register abstractions
schemaRegistry.registerSchema('data/abstraction/file', require('./abstractions/File'));
schemaRegistry.registerSchema('data/abstraction/note', require('./abstractions/Note'));
schemaRegistry.registerSchema('data/abstraction/tab', require('./abstractions/Tab'));
schemaRegistry.registerSchema('data/abstraction/todo', require('./abstractions/Todo'));


module.exports = schemaRegistry;
