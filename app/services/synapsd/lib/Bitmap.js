'use strict';

const RoaringBitmap32 = require('roaring/RoaringBitmap32')
const debug = require('debug')('canvas-synapsd-bitmap')


/**
 * Wrapper class for RoaringBitmap32 to support
 * persistence
 */


class Bitmap extends RoaringBitmap32 {


    #id;
    #kvstore;
    #serializationFormat =  false;

    constructor(id, kvstore = false, data = []) {
        if (!id) throw new Error('Bitmap ID must be defined')
        if (typeof data === 'number') data = [data]

        // Initialize the RoaringBitmap32 instance
        super(data)

        this.#id = id
        this.#kvstore = kvstore

        debug(`Initialized bitmap ID "${id}" ${kvstore ? 'backed by KVStore' : 'without persistance'}`)
    }

    /**
     * Getters
     */

    get id() { return this.#id; }
    get kvstore() { return this.#kvstore; }

    // TODO: Implement save method wrappers on the original methods
    // TODO: Add support for Uint32Array | ArrayBuffer.isView()

    tick(bitset, saveToBackend = true) {

        if (typeof bitset === 'number') {
            debug(`Tick for "${this.#id}" is of type number, running add(${bitset})`)
            this.add(bitset)    // sync method by default
            if (saveToBackend) this.save() // async
        }

        if (bitset instanceof RoaringBitmap32) {
            debug(`Tick for "${this.#id}" is of type RoaringBitmap32, running addMany(bitset)`)
        } else if (Array.isArray(bitset)) {
            debug(`Tick for "${this.#id}" is of type array, running addMany([${bitset.join(', ')}])`)
        } else {
            throw new TypeError(`Invalid input type, must be number or array, "${typeof bitset}" given`)
        }

        return this.addMany(bitset)

    }

    tickSync(bitset, saveToBackend = true) {}

    untick(bitset, saveToBackend = true) {

    }

    untickSync(set, saveToBackend = true) {}


    save() {
        if (!this.#kvstore) throw new Error('KVStore not set')
        this.#kvstore.put(this.#id, this.serialize(this.#serializationFormat))
    }

    saveSync() {
        if (!this.#kvstore) throw new Error('KVStore not set')
        this.#kvstore.putSync(this.#id, this.serialize(this.#serializationFormat))
    }

    #load() {
        if (!this.#kvstore) throw new Error('KVStore not set')
        let buffer = this.#kvstore.get(this.#id)
        if (!buffer) return
        this.deserialize(buffer, this.#serializationFormat)
    }

}

module.exports = Bitmap
