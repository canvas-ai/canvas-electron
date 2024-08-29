'use strict';

// Includes
const Layer = require('../Layer');


/**
 * Canvas Layer
 *
 * Can store context, feature and filter bitmaps + dashboard / UI layouts
 */
class CanvasLayer extends Layer {

    constructor(options = {}) {
        super(options);
    }

}

module.exports = CanvasLayer;
