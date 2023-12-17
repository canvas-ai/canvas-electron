const { RoaringBitmap32 } = require("roaring");

class Bitmap extends RoaringBitmap32 {

    constructor() {
        super();
    }

    tick() {}
    tickSync() {}

    untick() {}
    untickSync() {}

    save() {}
    load() {}

}

module.exports = Bitmap