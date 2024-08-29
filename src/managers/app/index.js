// Utils
const EventEmitter = require('eventemitter2');
const debug = require('debug')('canvas:managers:app');

/**
 * App manager
 */

class AppManager extends EventEmitter {

    #index;

    constructor(options = {}) {
        debug('Initializing Canvas App Manager');
        super();

        // Validate options
        if (!options.index) { throw new Error('Index not provided'); }
        this.#index = options.index;
    }

}

module.exports = AppManager;
