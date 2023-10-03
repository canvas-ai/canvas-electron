'use strict'


/**
 * Canvas Role manager
 */

// Environment
const { APP, USER, DEVICE } = require('../../env.js')


// Utils
const EventEmitter = require("eventemitter2");
const path = require("path");
const debug = require("debug")("canvas:role-manager")

// Default options
const defaultOptions = {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
};

/**
 * Role manager
 */

class RoleManager extends EventEmitter {

    constructor(params = {}) {

        debug('Initializing Canvas Role Manager')
        super();
        
        this.loadedRoles = new Map();
        this.initializedRoles = new Map();

    }

}

module.exports = RoleManager;
