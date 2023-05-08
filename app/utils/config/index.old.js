'use strict'


/**
 * Canvas \ Util \ Config
 */



// Utils
const path        = require('path')
const log         = console.log

// Data backend
//const { Store }   = require('data-store')

const DEFAULT_CONFIG_DIR  = path.resolve(__dirname, '../../../config')
const DEFAULT_CONFIG_NAME = 'config'
const DEFAULT_CONFIG_ROOT = path.resolve(__dirname, '../../../config')
const CONFIG_EXT  = 'json'
const CONFIG_SEP_TYPE = '.'
const CONFIG_SEP_SECTION = '_'

// Config class instances 
var INSTANCES = new Map()

class Config { //extends Store {

  constructor(opts = {}) {

    if (typeof opts === 'string') {
      var name = opts.toString()
      var root = DEFAULT_CONFIG_ROOT
    } else {
      var root = opts.root || DEFAULT_CONFIG_ROOT
      var name = opts.name || DEFAULT_CONFIG_NAME  
    }

    let configPath = path.join(root, `${name}.${CONFIG_EXT}`)

    /*
    super({
      name: name,
      path: configPath
    })*/
        
    log(`Config "${name}" initialized at ${configPath}`)

    // Load generic config (<name>.json)
    // Load platform config (<name>.<platform>.json)
    // Load device config (<name>.<deviceid>.json)
    // Merge to <name.merged.json>

    //if (fs.existsSync(path.join(root, `${name}${CONFIG_SEP_TYPE}${device.platform}.${CONFIG_EXT}`)))
    //if (fs.existsSync(path.join(root, `${name}${CONFIG_SEP_TYPE}${device.}.${CONFIG_EXT}`)))
    //if (fs.existsSync(path.join(root, `${name}${CONFIG_SEP_TYPE}${device.id}.${CONFIG_EXT}`)))

  }

  set platform(p) {}
  set device(p) {}

  get platform() {}
  get device() {}
  
  setForPlatform(k, v) {}
  getForPlatform() {}

  setForDevice(k, v) {}
  getForDevice() {}

  _merge() {}  

}



module.exports = (name = DEFAULT_CONFIG_NAME, root = DEFAULT_CONFIG_ROOT) => {

  if (!INSTANCES.has(name)) {
      INSTANCES.set(name, new Config(name))
  }

  return INSTANCES.get(name)

}

module.exports.Config = Config


// Priority from low to high(as used by config merge)
// ui.json
// ui.platform.json     // win32, linux, openbsd, freebsd, darwin
// ui.deviceID.json     // 8 - 32 bit hash
// ui.subsection.json   
// ui.subsection.platform.json
// ui.subsection.deviceID.json

// Every configuration can have 3 parts
// > .default    // fe apps.json
// > .platform   // apps.linux.json, apps.win32.json
// > .device     // apps.deviceID.json


/*

config = new Config(ui, "default")
config.get() // ret merged {}
config.get("platform")
config.get("colors")
config.set("view.resolution", 30)


  const Config = require("config")
  const myConfig = new Config("name")
  myConfig.put("test") // will implicitly set null
  myConfig.put("timestamp", date())
  myConfig.get("test") // will return null
  myCOnfig.set("test", 1)
  myConfig.put("test", 2) // Will return false as k:v already exist 
  myconfig.put("my.car.parts", [])
  myConfig.set("my.car.parts", ["partid1", "fooo"])'use strict'

// Utils
const path      = require('path')
const fs        = require('fs-extra')
const _         = require('lodash')
const log       = require(path.join(DIR.UTILS, "log"))

// Defaults
const DEFAUT_CONFIG_DIR = DIR.CONFIG
const DEFAULT_CONFIG_NAME = 'config'
const CONFIG_TYPE = 'default' // to remove
const CONFIG_EXT = 'json'
const CONFIG_SEP_SECTION = '.'
const CONFIG_SEP_TYPE = '-'
const CONFIG_PRIORITY = [
  "deviceID",
  "platform",
  "default"
]

class Config {
  constructor({}) {
    this.secret = 'easily scared',
    this.eyeCount = 4  
  }
}

const inputValidator = {
  get: function(target, prop, receiver) {
    console.log(prop)
    if (prop === 'secret') {
      return `${target.secret.substr(0, 4)} ... shhhh!`;
    } else {
      return Reflect.get(...arguments);
    }
  }
};

module.exports = new Proxy(Config, inputValidator)


/*

class Config {

  constructor(opts = {}) {
    
    // Temporary
    this._opts = {}
    this.test1 = "foo"

    // If path is set
    if(!_.isEmpty(opts.path)) {

      let path = path.parse(opts.path);
      this._opts.DIR = this.DIR = path.dir
      this._opts.NAME = this.NAME = path.name
      this._opts.EXT = this.EXT = path.ext.substring(1)
      this._opts.PATH = this.PATH = opts.path

    } else {

      // Path not set, dir not set
      if(_.isEmpty(opts.dir)) {
        // Use default config dir
        this._opts.DIR = this.DIR = DEFAUT_CONFIG_DIR

      } else {      
        // Use abspath or config-dir+path
        this._opts.DIR = this.DIR = (path.isAbsolute(opts.dir) ? opts.dir : path.join(DIR.CONFIG, opts.dir))
      }

      this._opts.NAME = this.NAME = _.isEmpty(opts.name) ? DEFAULT_CONFIG_NAME : opts.name
      this._opts.TYPE = this.TYPE = _.isEmpty(opts.type) ? CONFIG_TYPE : opts.type // to remove
      this._opts.EXT = this.EXT = _.isEmpty(opts.ext) ? CONFIG_EXT : opts.ext
      this._opts.PATH = this.PATH = path.join(this.DIR, this.NAME + "." + this.EXT)

    }

    this._opts.SEP_SECTION = this.SEP_SECTION = _.isEmpty(opts.sep_section) ? CONFIG_SEP_SECTION : opts.sep_section
    this._opts.SEP_TYPE = this.SEP_TYPE = _.isEmpty(opts.sep_type) ? CONFIG_SEP_TYPE : opts.sep_type
    this._opts.PRIORITY = this.PRIORITY = _.isEmpty(opts.priority) ? CONFIG_PRIORITY : opts.priority
    log.info("Config init(" + this.PATH + ")")
    //log.debug(this._opts, true)

    this._data = fs.readJSONSync(this.PATH, { throws: false })

  }
  
}

const ConfigInterface = {
  get: function(target, property, receiver) {
    console.log("Interface property " + property)
    console.log(property)
    console.log(target)
    console.log(typeof receiver)
    if (property === 'secret') {
      return "shhhh!"
    } else {
      return Reflect.get(...arguments);
    }
  }
};

*/

// Priority from low to high(as used by config merge)
// ui.json
// ui.platform.json     // win32, linux, openbsd, freebsd, darwin
// ui.deviceID.json     // 8 - 32 bit hash
// ui.subsection.json   
// ui.subsection.platform.json
// ui.subsection.deviceID.json

// Every configuration can have 3 parts
// > .default    // fe apps.json
// > .platform   // apps.linux.json, apps.win32.json
// > .device     // apps.deviceID.json


/*

config = new Config(ui, "default")
config.get() // ret merged {}
config.get("platform")
config.get("colors")
config.set("view.resolution", 30)


  const Config = require("config")
  const myConfig = new Config("name")
  myConfig.put("test") // will implicitly set null
  myConfig.put("timestamp", date())
  myConfig.get("test") // will return null
  myCOnfig.set("test", 1)
  myConfig.put("test", 2) // Will return false as k:v already exist 
  myconfig.put("my.car.parts", [])
  myConfig.set("my.car.parts", ["partid1", "fooo"])
  myConfig.setContext("my.car.parts")
  myConfig.put(["partid2", "baz"])
  myConfig.getContext() // will return my.car.parts
  myConfig.setContext() // Same as "/" or "" or null or "."

  myConfig.setNamespace() || "default"
  myConfig.setNamespace("platform")
  myConfig.setNamespace("device")
  myConfig.setNamespace("merged") || "runtime"
  myConfig
    .namespace("platform")
      .set("foo",[1,2,3])
        .save()
        .saveTo("")




class Config {

  constructor(opts = {}) {
    this.directory = _.isEmpty(opts.path) ? DIR.CONFIG : opts.path
  }

  get(name, reload = false) {
    if (!name) return null

    if (typeof this.config[name] === 'undefined' || reload === true) {
      log.info('Reading ' + name + ' from file')
      this.config[name] = this.loadDefault(name)
    }
  
    return this.config[name]
  }

  set(name, obj, save = false) {

  }

}

*/


// Global config constructor
/*
var Config = function(name) {
  (!name) ? log.debug("Config.init()") : log.debug("Config.init(" + name + ")")
}


Config.prototype.set = function(name, value, save = false) {
  if (!name || !value) return false
  this.config[name] = value
  if (save) {
    save(name, value)
  }
  return true
}

// config.load(name.json ? name.platform.json ? name.deviceID.json)
Config.prototype.load = function(name = 'default') {
  log.error("config.load not implemented yet");
}

// config.load(name.json)
Config.prototype.loadDefault = function(name = 'default') {
  let file = path.join(DIR.CONFIG, name + '.' + CONFIG_EXT)
  return fs.readJSONSync(file, { throws: false }) // Returns null if JSON is invalid,
}

// config.load(name.platform.json)
Config.prototype.loadPlatform = function(name = 'default') {
  let file = path.join(DIR.CONFIG, name + '.' + device.platform + '.' + CONFIG_EXT)
  return fs.readJSONSync(file, { throws: false }) // Returns null if JSON is invalid,
}

// config.load(name.deviceID.json)
Config.prototype.loadDevice = function(name = 'default') {
  let file = path.join(DIR.CONFIG, name + '.' + device.id + '.' + CONFIG_EXT)
  return fs.readJSONSync(file, { throws: false }) // Returns null if JSON is invalid,
}

// config.save(name.deviceID.json, if not exist name.platform.json)
function save(name) {
  log.error("config.save not implemented yet");
}

// config.save to name.json
function saveDefault(name, data, createFile = true) {
  if (!name || _.isEmpty(data)) return false
  let file = path.join(DIR.CONFIG, name + '.' + CONFIG_EXT)
  
  fs.writeJson(file, { spaces: 4 })
    .then(() => {
      log.info('Config written to ', file)
    })
    .catch(err => {
      log.error(err)
      return false
    })
    
    return true
}

// config.save to name.platform.json, create if it doesn't exist
function savePlatform(name, data, createFile = true) {
  if (!name || _.isEmpty(data)) return false
  let file = path.join(DIR.CONFIG, name + '.' + device.platform + '.' + CONFIG_EXT)

  fs.writeJson(file, { spaces: 4 })
    .then(() => {
      log.info('Config written to ', file)
    })
    .catch(err => {
      log.error(err)
      return false
    })
    
    return true
}

// config.save to name.deviceID.json, create if it doesn't exist
function saveDevice(name, data, createFile = true) {
  if (!name || _.isEmpty(data)) return false
  let file = path.join(DIR.CONFIG, name + '.' + device.id + '.' + CONFIG_EXT)

  fs.writeJson(file, { spaces: 4 })
    .then(() => {
      log.info('Config written to ', file)
    })
    .catch(err => {
      log.error(err)
      return false
    })

    return true
}

//var config = module.exports = new Config();
//module.exports = Config
//module.exports = Config
  myConfig.setContext("my.car.parts")
  myConfig.put(["partid2", "baz"])
  myConfig.getContext() // will return my.car.parts
  myConfig.setContext() // Same as "/" or "" or null or "."

  myConfig.setNamespace() || "default"
  myConfig.setNamespace("platform")
  myConfig.setNamespace("device")
  myConfig.setNamespace("merged") || "runtime"
  myConfig
    .namespace("platform")
      .set("foo",[1,2,3])
        .save()
        .saveTo("")




class Config {

  constructor(opts = {}) {
    this.directory = _.isEmpty(opts.path) ? DIR.CONFIG : opts.path
  }

  get(name, reload = false) {
    if (!name) return null

    if (typeof this.config[name] === 'undefined' || reload === true) {
      log.info('Reading ' + name + ' from file')
      this.config[name] = this.loadDefault(name)
    }
  
    return this.config[name]
  }

  set(name, obj, save = false) {

  }

}

*/


// Global config constructor
/*
var Config = function(name) {
  (!name) ? log.debug("Config.init()") : log.debug("Config.init(" + name + ")")
}


Config.prototype.set = function(name, value, save = false) {
  if (!name || !value) return false
  this.config[name] = value
  if (save) {
    save(name, value)
  }
  return true
}

// config.load(name.json ? name.platform.json ? name.deviceID.json)
Config.prototype.load = function(name = 'default') {
  log.error("config.load not implemented yet");
}

// config.load(name.json)
Config.prototype.loadDefault = function(name = 'default') {
  let file = path.join(DIR.CONFIG, name + '.' + CONFIG_EXT)
  return fs.readJSONSync(file, { throws: false }) // Returns null if JSON is invalid,
}

// config.load(name.platform.json)
Config.prototype.loadPlatform = function(name = 'default') {
  let file = path.join(DIR.CONFIG, name + '.' + device.platform + '.' + CONFIG_EXT)
  return fs.readJSONSync(file, { throws: false }) // Returns null if JSON is invalid,
}

// config.load(name.deviceID.json)
Config.prototype.loadDevice = function(name = 'default') {
  let file = path.join(DIR.CONFIG, name + '.' + device.id + '.' + CONFIG_EXT)
  return fs.readJSONSync(file, { throws: false }) // Returns null if JSON is invalid,
}

// config.save(name.deviceID.json, if not exist name.platform.json)
function save(name) {
  log.error("config.save not implemented yet");
}

// config.save to name.json
function saveDefault(name, data, createFile = true) {
  if (!name || _.isEmpty(data)) return false
  let file = path.join(DIR.CONFIG, name + '.' + CONFIG_EXT)
  
  fs.writeJson(file, { spaces: 4 })
    .then(() => {
      log.info('Config written to ', file)
    })
    .catch(err => {
      log.error(err)
      return false
    })
    
    return true
}

// config.save to name.platform.json, create if it doesn't exist
function savePlatform(name, data, createFile = true) {
  if (!name || _.isEmpty(data)) return false
  let file = path.join(DIR.CONFIG, name + '.' + device.platform + '.' + CONFIG_EXT)

  fs.writeJson(file, { spaces: 4 })
    .then(() => {
      log.info('Config written to ', file)
    })
    .catch(err => {
      log.error(err)
      return false
    })
    
    return true
}

// config.save to name.deviceID.json, create if it doesn't exist
function saveDevice(name, data, createFile = true) {
  if (!name || _.isEmpty(data)) return false
  let file = path.join(DIR.CONFIG, name + '.' + device.id + '.' + CONFIG_EXT)

  fs.writeJson(file, { spaces: 4 })
    .then(() => {
      log.info('Config written to ', file)
    })
    .catch(err => {
      log.error(err)
      return false
    })

    return true
}
*/
//var config = module.exports = new Config();
//module.exports = Config

function parseOpts(opts) {

    /* 
    // If path is set

      let path = path.parse(opts.path);
      this._opts.DIR = this.DIR = path.dir
      this._opts.NAME = this.NAME = path.name
      this._opts.EXT = this.EXT = path.ext.substring(1)
      this._opts.PATH = this.PATH = opts.path

    } else {

      // Path not set, dir not set
      if(_.isEmpty(opts.dir)) {
        // Use default config dir
        this._opts.DIR = this.DIR = DEFAUT_CONFIG_DIR

      } else {      
        // Use abspath or config-dir+path
        this._opts.DIR = this.DIR = (path.isAbsolute(opts.dir) ? opts.dir : path.join(DIR.CONFIG, opts.dir))
      }

      this._opts.NAME = this.NAME = _.isEmpty(opts.name) ? DEFAULT_CONFIG_NAME : opts.name
      this._opts.TYPE = this.TYPE = _.isEmpty(opts.type) ? CONFIG_TYPE : opts.type // to remove
      this._opts.EXT = this.EXT = _.isEmpty(opts.ext) ? CONFIG_EXT : opts.ext
      this._opts.PATH = this.PATH = path.join(this.DIR, this.NAME + "." + this.EXT)

    }

    this._opts.SEP_SECTION = this.SEP_SECTION = _.isEmpty(opts.sep_section) ? CONFIG_SEP_SECTION : opts.sep_section
    this._opts.SEP_TYPE = this.SEP_TYPE = _.isEmpty(opts.sep_type) ? CONFIG_SEP_TYPE : opts.sep_type
    this._opts.PRIORITY = this.PRIORITY = _.isEmpty(opts.priority) ? CONFIG_PRIORITY : opts.priority
    */
  return {}
}