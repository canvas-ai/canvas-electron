
class MemCache {

    constructor() {
        this.cache = new Map()
        this.references = new Map()

        // TODO, needed for dynamic features / synapses, requires a persistent storage backend
        this.stats = {}
    }

    get(key) { return this.cache.get(key); }

    set(key, value) {
        this.cache.set(key, value)
        this.#incrRefCount(key)
    }

    has(key) { return this.cache.has(key); }

    remove(key) {
        if (this.#decRefCount(key) === false) {
            this.references.delete(key)
            this.cache.delete(key)
        }
    }

    delete(key) {
        this.references.delete(key)
        this.cache.delete(key)
    }

    list() { return Array.from(this.cache.keys()); }

    clear() {
        this.cache.clear()
        this.references.clear()
    }

    #incrRefCount(key) {
        let currentCount = this.references.get(key) || 0
        this.references.set(key, currentCount + 1)
    }

    #decRefCount(key) {
        let currentCount = this.references.get(key) || 0
        if (currentCount == 0) return false
        this.references.set(key, currentCount - 1)
    }

}

module.exports = MemCache
