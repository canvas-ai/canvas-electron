"use strict";

// Utils
const os = require("os");
const path = require("path");
const debug = require("debug")("canvas-db");
const crypto = require("crypto");
const JsonMap = require("../../utils/JsonMap");
const uuid12 = () => {
  return ([1e3] + -1e3 + -1e3).replace(/[018]/g, (b) =>
    (b ^ (crypto.rng(1)[0] % 16 >> (b / 4))).toString(16)
  );
};

// Database backend
const { Level } = require("level");

/**
 * Canvas DB wrapper
 */

class Db {
  #dataset = "/";

  constructor(options, dataset) {
    // Parse input arguments
    if (options.sublevel === undefined) {
      options = {
        path: path.join(os.homedir(), ".canvas/db"),
        readOnly: false,
        logLevel: "info",
        ...options,
      };

      this.db = new Level(options.path, options);
      debug(`Initialized database "${options.path}"`);
    } else {
      this.db = options;
      this.#dataset = dataset;
      debug(`Initialized dataset "${dataset}"`);
    }
  }

  get status() {
    return this.db.status;
  }

  // TODO
  async count() {
    let count = await this.db.get(".count");
    console.log(count);
    return count ? count : 0;
  }
  async last() {}
  async lastKey() {}
  async lastValue() {}

  async open(options, cb) {
    this.db.open(options, cb);
  }
  async close(cb) {
    this.db.close(db);
  }

  async has(key) {
    try {
      const value = await this.db.get(key);
      return value;
    } catch (err) {
      if (err.code === "LEVEL_NOT_FOUND") {
        console.log(`Key ${key} not found`);
        return false;
      } else {
        throw err;
      }
    }
  }

  async get(key) {
    try {
      const value = await this.db.get(key);
      return value;
    } catch (err) {
      if (err.code === "LEVEL_NOT_FOUND") {
        console.log(`Key ${key} not found`);
        return null;
      } else {
        throw err;
      }
    }
  }

  async getMany(keys, options = null, cb = null) {
    return await this.db.getMany(keys, options, cb);
  }

  async put(key, value) {
    // Check if the key already exists
    let keyExists = await this.has(key);

    // Return true if the key-value pair is already stored in the database
    if (keyExists === value) return true;

    // insert a new key-value pair
    await this.db.put(key, value, (err) => {
      if (err) throw err;
      debug(`Successfully added type ${typeof value} under key ${key}`);
    });

    await this.#incrRecordCount();
  }

  async list() {
    let arr = [];

    for await (const [key, value] of this.db.iterator()) {
      console.log([key, value]);
      arr[key] = value;
    }

    return arr;
  }

  async listKeys() {
    let keys = [];

    for await (const key of this.db.keys()) {
      keys.push(key);
    }

    return keys;
  }

  async listValues() {
    let values = [];

    for await (const value of this.db.values()) {
      values.push(value);
    }

    return values;
  }

  async delete(key) {
    await this.db.del(key, (err) => {
      if (err) throw err;
      console.log(`Successfully deleted key ${key}`);
      return true;
    });
  }

  // Async? Rework
  createDataset(dataset, options = {}) {
    const sublevel = this.db.sublevel(dataset, options);
    return new Db(sublevel, dataset);
  }

  async removeDataset(path) {}

  // Returns the underlying database object
  // Useful for testing purposes
  get backend() {
    return this.db;
  }

  // TODO: Does not work as intended
  async #incrRecordCount(n = 1) {
    // retrieve current count value
    let count = (await this.has(".count")) || 0;

    // update the count key
    count = parseInt(count, 10);
    count = count + n;

    await this.db.put(".count", count, (err) => {
      if (err) throw err;
      debug(`Successfully updated count to ${count}`);
    });
  }

  async #decrRecordCount(n = 1) {
    // retrieve current count value
    let count = await this.has(".count");

    // update the count key
    count = parseInt(count, 10);
    if (count <= 0) return;
    count = count - n;

    await this.db.put(".count", count, (err) => {
      if (err) throw err;
      debug(`Successfully updated count to ${count}`);
    });
  }
}

module.exports = Db;
