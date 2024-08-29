const loki = require('lokijs');
const path = require('path');
const fs = require('fs').promises;
const Collection = require('./Collection');

class PersistentIndex {

    constructor(configRootPath) {
        this.configRootPath = configRootPath;
        this.db = null;
        this.indexes = {};
    }

    async init() {
        await this.ensureConfigDir();
        await this.initDatabase();
    }

    async ensureConfigDir() {
        try {
            await fs.mkdir(this.configRootPath, { recursive: true });
        } catch (err) {
            console.error('Error creating config directory:', err);
        }
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(this.configRootPath, 'index.db');
            this.db = new loki(dbPath, {
                autoload: true,
                autosave: true,
                autosaveInterval: 4000,
                autoloadCallback: () => {
                    resolve();
                }
            });
        });
    }

    create(name) {
        if (this.indexes[name]) {
            console.warn(`Index '${name}' already exists.`);
            return this.indexes[name];
        }

        let collection = this.db.getCollection(name);
        if (!collection) {
            collection = this.db.addCollection(name, { unique: ['key'] });
        }

        this.indexes[name] = new Collection(this.db, collection);
        return this.indexes[name];
    }

    get(name) {
        return this.indexes[name];
    }

    // Expose native LokiJS database object
    getNativeDb() {
        return this.db;
    }
}

module.exports = PersistentIndex;
