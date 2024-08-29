'use strict';

// Includes
const Layer = require('../Layer');


/**
 * Workspace Layer
 *
 * Represents a separate "microverse" with its own data and event sources
 * (e.g. a workspace for a specific project, client or team), exportable
 * and shareable as a whole. Uses its own indexes.
 */
class WorkspaceLayer extends Layer {

    constructor(options = {}) {
        super(options);
    }

}

module.exports = WorkspaceLayer;
