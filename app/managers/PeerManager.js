'use strict'


// Environment
const { app, user, transport, isElectron } = require('../env.js')

// Utils
const EventEmitter = require("eventemitter2");
const path = require("path");
const debug = require("debug")("canvas:app-manager")


/**
 * Identity manager
 */

class IdentityManager extends EventEmitter {}



module.exports = IdentityManager;
