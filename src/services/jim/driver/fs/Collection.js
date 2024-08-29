const fs = require('fs').promises;

class Collection {

    constructor(filePath) {
        this.filePath = filePath;
        this.data = {};
    }

    async load() {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            this.data = JSON.parse(content);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading data:', error);
            }
            // If file doesn't exist, we'll start with an empty object
            this.data = {};
        }
    }

    async save() {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    async put(key, value) {
        await this.load();
        this.data[key] = value;
        await this.save();
        return this;
    }

    async get(key) {
        await this.load();
        return this.data[key];
    }

    async has(key) {
        await this.load();
        return key in this.data;
    }

    async delete(key) {
        await this.load();
        const hadKey = key in this.data;
        delete this.data[key];
        await this.save();
        return hadKey;
    }

    async list() {
        await this.load();
        return Object.keys(this.data);
    }

    async entries() {
        await this.load();
        return Object.entries(this.data);
    }

    async clear() {
        this.data = {};
        await this.save();
    }

    async size() {
        await this.load();
        return Object.keys(this.data).length;
    }
}

module.exports = Collection;
