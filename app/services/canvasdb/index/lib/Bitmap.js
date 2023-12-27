const { RoaringBitmap32 } = require("roaring");

class Bitmap extends RoaringBitmap32 {

    constructor(oidArrayOrBitmap, options = {
        type: 'static', // 'static' or 'dynamic
        rangeMin: 0,
        rangeMax: 4294967296 - 1    // 2^32 - 1
    }) {

        // TODO: Add range checks!

        super(oidArrayOrBitmap);
        this.type = options.type;
        this.key = options.key;
        this.rangeMin = options.rangeMin;
        this.rangeMax = options.rangeMax;

        debug(`Bitmap "${this.key}" type ${this.type}, ID range: ${this.rangeMin} - ${this.rangeMax} initialized`);
        debug(`Bitmap "${this.key}" has ${this.size} objects`);
    }

    tick(oid) {
        if (!this.#oidIsWithinRange(oid)) {
            throw new Error(`Object ID ${oid} not within range: ${this.rangeMin} - ${this.rangeMax}`);
        }
        this.add(oid);
    }

    tickMany(...oidArray) {
        if (!this.#arrayIsWithinRange(oidArray)) {
            throw new Error(`Invalid oidArray: ${oidArray}, range: ${this.rangeMin} - ${this.rangeMax}`);
        }
        this.addMany(oidArray);
    }

    tickArray(oidArray) {
        if (!Array.isArray(oidArray)) { throw new Error(`Not an array: ${oidArray}`); }
        if (oidArray.length === 0) return;

        // Range check
        for (const oid of oidArray) {
            if (oid < this.rangeMin || oid > this.rangeMax) {
                throw new Error(`Out of range: ${oid}`);
            }
        }

        this.addMany(oidArray);
    }

    tickBitmap(bitmap) {
        if (!this.#bitmapIsWithinRange(bitmap)) {
            throw new Error(`Invalid bitmap: ${bitmap}, range: ${this.rangeMin} - ${this.rangeMax}`);
        }
        this.addMany(bitmap);
    }

    untick(oid) {
        if (!this.#oidIsWithinRange(oid)) {
            throw new Error(`Object ID "${oid}" out of range: ${this.rangeMin} - ${this.rangeMax}`);
        }
        this.remove(oid);
    }

    untickMany(...oidArray) {
        if (!this.#arrayIsWithinRange(oidArray)) {
            throw new Error(`Out of range: ${oidArray}, range: ${this.rangeMin} - ${this.rangeMax}`);
        }
        this.removeMany(oidArray);
    }

    untickArray(oidArray) {
        if (!this.#arrayIsWithinRange(oidArray)) {
            throw new Error(`Out of range: ${oidArray}, range: ${this.rangeMin} - ${this.rangeMax}`);
        }
        if (oidArray.length === 0) return;

        this.removeMany(oidArray);
    }

    untickBitmap(bitmap) {
        if (!this.#bitmapIsWithinRange(bitmap)) {
            throw new Error(`Invalid bitmap: ${bitmap}, range: ${this.rangeMin} - ${this.rangeMax}`);
        }
        this.removeMany(bitmap);
    }


    /**
     * Static methods
     */

    static validateRange(inputData, rangeMin, rangeMax) {
        if (rangeMin < 0) {
            throw new Error(`Invalid rangeMin: ${rangeMin}`);
        }
        if (rangeMax < 0) {
            throw new Error(`Invalid rangeMax: ${rangeMax}`);
        }
        if (rangeMin > rangeMax) {
            throw new Error(`Invalid range: ${rangeMin} - ${rangeMax}`);
        }

        if (typeof inputData === 'number') {
            if (inputData < rangeMin || inputData > rangeMax) {
                throw new Error(`Out of range: ${inputData}`);
            }
        } else if (Array.isArray(inputData)) {
            for (const oid of inputData) {
                if (oid < rangeMin || oid > rangeMax) {
                    throw new Error(`Out of range: ${oid}`);
                }
            }
        } else if (inputData instanceof RoaringBitmap32) {
            const minId = inputData.minimum();
            const maxId = inputData.maximum();
            if (minId < rangeMin || maxId > rangeMax) {
                throw new Error(`Out of range: ${minId} - ${maxId}`);
            }
        } else {
            throw new Error(`Invalid input data: ${inputData}`);
        }

    }

    /**
     * Private methods
     */

    #oidIsWithinRange(oid) {
        return (oid >= this.rangeMin && oid <= this.rangeMax);
    }

    #arrayIsWithinRange(oidArray) {
        if (!Array.isArray(oidArray)) { throw new Error(`Not an array: ${oidArray}`); }
        for (const oid of oidArray) {
            if (!this.#oidIsWithinRange(oid)) return false;
        }
        return true;
    }

    #bitmapIsWithinRange(bitmap) {
        if (!(bitmap instanceof RoaringBitmap32)) {
            throw new Error(`Not a RoaringBitmap32 instance: ${bitmap}`);
        }
        const minId = bitmap.minimum();
        const maxId = bitmap.maximum();
        return this.#oidIsWithinRange(minId) && this.#oidIsWithinRange(maxId);
    }

}

module.exports = Bitmap;
