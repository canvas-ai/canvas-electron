const fsDriver = require('./driver/fs');
const lokiDriver = require('./driver/lokijs');
const debug = require('debug')('canvas:service:jim');

class JsonIndexManager {

    constructor(rootPath) {
        if (!rootPath) {
            throw new Error('rootPath is required');
        }

        this.rootPath = rootPath;
        debug('Initializing JsonIndexManager service with rootPath:', rootPath);

        this.indices = new Map();
    }

    async create(name, driver) {
        if (this.indices.has(name)) {
            console.error(`Index '${name}' already exists.`);
            //throw new Error(`Index '${name}' already exists`);
            return false;
        }

        let index;
        if (driver === 'fs') {
            index = new fsDriver(this.rootPath);
        } else if (driver === 'lokijs') {
            index = new lokiDriver(this.rootPath);
        } else {
            throw new Error(`Unsupported driver: ${driver}`);
        }

        await index.init();
        this.indices.set(name, { index, driver });

        return index;
    }

    get(name) {
        const indexData = this.indices.get(name);
        if (!indexData) {
            throw new Error(`Index '${name}' not found`);
        }

        return indexData.index;
    }

    // Expose native LokiJS database object
    getDb(name) {
        const indexData = this.indices.get(name);
        if (!indexData) {
            throw new Error(`Index '${name}' not found`);
        }

        if (indexData.driver !== 'lokijs') {
            throw new Error('Database object is only available when using LokiJS driver.');
        }

        return indexData.index.db;
    }
}

module.exports = JsonIndexManager;
