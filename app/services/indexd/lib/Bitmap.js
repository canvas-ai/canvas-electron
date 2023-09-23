'use strict';

const RoaringBitmap32 = require('roaring/RoaringBitmap32')
const debug = require('debug')('canvas-index-bitmap')


class Bitmap extends RoaringBitmap32 {


    #id

    constructor(id, data = []) {

        if (typeof data === 'number') data = [data]

        super(data)
        this.#id = id
        debug(`Initialized bitmap ID "${id}"`)
    }

    get id() { return this.#id; }

    // TODO: Implement save method wrappers on the original methods
    // TODO: Add support for Uint32Array | ArrayBuffer.isView()

    tick(bitset) {

        if (typeof bitset === 'number') {
            debug(`Tick for "${this.#id}" is of type number, running add(${bitset})`)
            return this.add(bitset)
        }

        if (bitset instanceof RoaringBitmap32) {
            debug(`Tick for "${this.#id}" is of type RoaringBitmap32, running addMany(bitset)`)
            return this.addMany(bitset)
        }

        if (Array.isArray(bitset)) {
            debug(`Tick for "${this.#id}" is of type array, running addMany([${bitset.join(', ')}])`)
            return this.addMany(bitset)
        }

        throw new TypeError(`Invalid input type, must be number or array, "${typeof bitset}" given`)
    }

    untick(bitset) {

        if (typeof bitset === 'number') {
            debug(`Tick for "${this.#id}" is of type number, running remove(${bitset})`)
            return this.remove(bitset)
        }

        if (bitset instanceof RoaringBitmap32) {
            debug(`Tick for "${this.#id}" is of type RoaringBitmap32, running removeMany(bitset)`)
            return this.removeMany(bitset)
        }

        if (Array.isArray(bitset)) {
            debug(`Tick for "${this.#id}" is of type array, running removeMany([${bitset.join(', ')}])`)
            return this.removeMany(bitset)
        }

        throw new TypeError('Invalid input type, must be number or array')
    }

    async save() {}
    saveSync() {}

    async load() {}
    loadSync() {}

    static deserialize(id, buffer, portable = true) {
        let bitmap = super.deserialize(buffer, portable)
        return new Bitmap(id, bitmap)
    }

}

module.exports = Bitmap
