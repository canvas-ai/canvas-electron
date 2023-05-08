"use strict";

/**
 * Canvas \ Util \ Config
 */

const Conf = require("conf");
const path = require("path");

const DEFAULT_NAME = "config";
const DEFAULT_ROOT = "";

var CONFIGS = new Map();

// Wrapper around the great Conf utility
class Config extends Conf {
  constructor(options) {
    let defaultCwd;
    let appVersion;

    options = {
      name: "config",
      ...options,
    };

    if (!options.projectVersion) {
      options.projectVersion = appVersion;
    }

    if (options.path) {
      options.cwd = path.isAbsolute(options.path)
        ? options.path
        : path.join(defaultCwd, options.path);
    } else {
      options.cwd = defaultCwd;
    }

    options.configName = options.name;
    delete options.name;

    super(options);
  }
}

// One global logger vs per instance?
module.exports = (name = "config", opts = {}) => {
  if (!CONFIGS.has(name)) {
    CONFIGS.set(name, new Config(name, opts));
  }

  return CONFIGS.get(name);
};
