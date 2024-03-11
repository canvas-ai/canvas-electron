'use strict'


/**
 * data.abstraction.File
 */

// Utils
const log           = console.log
//const fileinfo      = require('./fileinfo')
//const hash          = require('./hash')
//const { struct }    = require('superstruct')
//const Data          = require('../../')

// Includes
const StorageAbstraction = require('../StorageAbstraction')


class File extends StorageAbstraction {

/**
 *Creates an instance of File
 * @param {*} f : File path
 * @param {*} hash : Hash ID(will be generated if missing)
 * @memberof File
 */
constructor(f, hash) {
    this.id = 0
    this.names = new Set()
    this.paths = new Set()
    super()
  }
  
  async save() {}

  async remove() {}

  async rename() {}

}

module.exports = File
