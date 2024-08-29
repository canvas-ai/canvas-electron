class Collection {

    constructor(db, collection) {
        this.db = db;
        this.collection = collection;
    }

    async put(key, value) {
        const existingItem = this.collection.findOne({ key });
        if (existingItem) {
            existingItem.value = value;
            this.collection.update(existingItem);
        } else {
            this.collection.insert({ key, value });
        }
        await this.save();
        return this;
    }

    get(key) {
        const item = this.collection.findOne({ key });
        return item ? item.value : undefined;
    }

    has(key) {
        return this.collection.findOne({ key }) !== null;
    }

    async delete(key) {
        const item = this.collection.findOne({ key });
        if (item) {
            this.collection.remove(item);
            await this.save();
            return true;
        }
        return false;
    }

    list() {
        return this.collection.chain().simplesort('key').data().map(item => item.key);
    }

    entries() {
        return this.collection.chain().simplesort('key').data().map(item => [item.key, item.value]);
    }

    async clear() {
        this.collection.clear();
        await this.save();
    }

    size() {
        return this.collection.count();
    }

    save() {
        return new Promise((resolve, reject) => {
            this.db.saveDatabase(err => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Expose native LokiJS collection object
    getNativeCollection() {
        return this.collection;
    }
}

module.exports = Collection;
