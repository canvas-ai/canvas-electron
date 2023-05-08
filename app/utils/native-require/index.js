'use strict'


// Utils
const path      = require('path')
const log       = console.log
const device    = require('../device')

// Config
const SUFFIX_WIN32 = '.win32'
const SUFFIX_LINUX = '.linux'
const SUFFIX_LINUX_MUSL = '.linux-musl'

const SEARCH_DIRS = [
    path.join(__dirname),
    path.join(__dirname, 'node_modules'),
]

module.exports = function(name, modulePath) {


    let resolvedPath = path.resolve(modulePath)

    if (device.os.platform === 'linux') {

        return require(path.join(resolvedPath, ))
        //var bitmap = require('roaring/RoaringBitmap32') //require(path.join(__dirname, `node_modules.linux.${device.os.libc}/roaring/RoaringBitmap32`))
        //var level = require('level') //require(path.join(__dirname, `node_modules.linux.${device.os.libc}/level-rocksdb`))
      
      } else if (device.os.platform === 'win32') {
      
        //var bitmap = require(path.join(__dirname, 'node_modules.win32/roaring/RoaringBitmap32'))
        //var level = require(path.join(__dirname, 'node_modules.win32/level-rocksdb'))
      
      } else {
      
        log(`Platform ${device.os.platform} not supported, program will now exit`)
        process.exit(1)
      
    }    

}

const paths = resolve.getLookupPaths();  // returns a mutable *copy*
paths.unshift('/some/other/path');  // prepend
paths.push('/another/path');   // append
resolve(name, { paths });