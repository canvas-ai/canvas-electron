

// Temporary
const Desktop = require('./types/Desktop');

class DeviceManager {

    constructor() {}
  
    static getCurrentDevice() {
        return new Desktop();
    }
  
}
  
module.exports = DeviceManager;