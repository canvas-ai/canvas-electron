"use strict";


// Utils
const { machineId, machineIdSync } = require("node-machine-id");
const os = require("os");
const ip = require("ip");

class Device {
  constructor() {
    this.id = machineIdSync(true).substr(0, 11);
    this.endianness = os.endianness();
    this.os = {
      arch: os.arch(),
      platform: os.platform(),
      release: os.release(),
      libc: require("detect-libc").familySync() || "n/a",
      hostname: os.hostname(),
      homedir: os.homedir(),
      /*
        os.homedir()
        The value of homedir returned by os.userInfo() is provided by the operating system.
        This differs from the result of os.homedir(), which queries several environment variables
        for the home directory before falling back to the operating system response.
        */
    };

    this.network = {
      address: ip.address("public"), // Replace with getHostIP() ?
      hostname: os.hostname(), //TODO: Assignment fix
    };

    this.user = os.userInfo(); // Probably better to handle this on our own ?
  }

  //get id() { return this._id }
  //get endianness() { return this._endianness }
  //get os() { return this._os }
  //get network() { return this._network }
  //get user() { return this._user }

  // Shortcuts
  get ip() {
    return this.network.address;
  }
  get activeIP() {
    return getActiveIP();
  }
  get hostname() {
    return this.network.hostname;
  }
}

module.exports = new Device(); // Singleton

function getActiveIP() {
  let nets = require("os").networkInterfaces();

  for (let i in nets) {
    var candidate = nets[i].filter(function (item) {
      return item.family === "IPv4" && !item.internal;
    })[0];

    if (candidate) {
      return candidate.address;
    }
  }

  return "127.0.0.1";
}
