const RoaringBitmap32 = require('roaring/RoaringBitmap32')
const debug = require('debug')('canvas-synapsd-bitmapset')

// BitmapSet ? BitmapCollection
class BitmapSet {


    #kvstore;
    #idMin = 64*1024;  // 2^16
    #idMax = 2**32;

    constructor(kvstore, options = {}) {
        this.#kvstore = kvstore;


    }

    tick() {}
    tickSync() {}
    tickBitmapArray() {}
    tickBitmapArraySync() {}

    untick() {}
    untickSync() {}
    untickBitmapArray() {}
    untickBitmapArraySync() {}

    save() {}
    load() {}

}


module.exports = BitmapSet
