const { Index, Document } = require("flexsearch");
const fs = require('fs').promises;
const debug = require('debug')('canvas:synapsd:fts');

class Fts {

    #store;
    #options;

    constructor(backingStore, indexOptions = {
        preset: 'performance',
        tokenize: 'forward',
        cache: true,
    }) {
        if (!backingStore) { throw new Error('Map() - like backingStore is required'); }
        this.#store = backingStore;
        this.#options = indexOptions;
        // https://github.com/nextapps-de/flexsearch
        this.index = Index(this.#options);
        this.loadIndex();
    }

    async insert(id, str) {
        if (!id || !str) { return false; }
        if (typeof str === 'string') { str = [str]; }
        if (str.length === 0) { return false; }

        for (const input of str) {
            await this.index.addAsync(id, input); // Uses update internally anyway
        }

        await this.saveIndex();
    }

    async update(id, str) {
        await this.remove(id);
        await this.insert(id, str);
    }

    async remove(id) {
        await this.index.removeAsync(id);
        await this.saveIndex();
    }

    async search(query, limit = 100) {
        const results = await this.index.searchAsync(query, limit);
        return results;
    }

    searchSync(query, limit = 100) {
        // TODO: Current backend does not support searching on a subset of documents
        // We can get those cheaply, so a nice task for whoever picks this up
        return this.index.search(query, limit);
    }

    /**
     * Utils
     */

    async loadIndex() {
        const data = await this.#store.get('index');
        if (!data) {
            console.log('No existing index found. Starting with an empty index.');
            return;
        }
        this.index.import(data);
    }

    async loadIndexFromFile() {
        try {
            const data = await fs.readFile(this.indexPath, 'utf8');
            const dump = JSON.parse(data);
            await this.index.import(dump);
            console.log('Index loaded successfully');
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No existing index found. Starting with an empty index.');
            } else {
                console.error('Error loading index:', error);
            }
        }
    }

    async saveIndex() {
        const dump = this.index.export();
        await this.#store.put('index', dump);
    }

    async saveIndexToFile() {
        try {
            const dump = await this.index.export();
            await fs.writeFile(this.indexPath, JSON.stringify(dump));
            console.log('Index saved successfully');
        } catch (error) {
            console.error('Error saving index:', error);
        }
    }
}

module.exports = Fts;
