'use strict';

// Includes
const Layer = require('../Layer');


/**
 * Label Layer
 *
 * Label only (no associated bitmaps)
 */
class LabelLayer extends Layer {

    constructor(options = {}) {
        super(options);
    }

}

module.exports = LabelLayer;
