'use strict'

// Environment
const { APP, USER, DEVICE } = require('../../env.js')

// Utils
const EventEmitter = require("eventemitter2");


/**
 * Peer manager
 */

class PeerManager extends EventEmitter {}



module.exports = PeerManager;
