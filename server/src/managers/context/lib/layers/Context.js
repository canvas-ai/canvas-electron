'use strict';

// Includes
const Layer = require('../Layer');


/**
 * Context Layer
 *
 * Has context bitmaps only, default layer type
 */
class ContextLayer extends Layer {

    constructor(options = {}) {
        super(options);
    }

}

module.exports = ContextLayer;
