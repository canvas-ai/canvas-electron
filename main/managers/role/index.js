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

    startRole() {}

    stopRole() {}

    restartRole() {}

    getRoleStatus() {}

    loadRole(role) {
        debug(`Loading role ${role}`)
        const rolePath = path.join(__dirname, role);
        const roleModule = require(rolePath);
        this.loadedRoles.set(role, roleModule);
    }

    unloadRole(role) {
        debug(`Unloading role ${role}`)
        this.loadedRoles.delete(role);
    }

    initializeRole(role, options = {}) {
        debug(`Initializing role ${role}`)
        const roleModule = this.loadedRoles.get(role);
        roleModule.initialize(options);
        this.initializedRoles.set(role, roleModule);
    }

    migrateRole(roleID, backend , options = {}) {
        debug(`Migrating role ${roleID}`)
    }


}

module.exports = RoleManager;
