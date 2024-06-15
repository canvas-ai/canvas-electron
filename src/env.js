/**
 * Canvas environment variables
 */

// Utils
const path = require('path');
const fs = require('fs');
const os = require('os');
const pkg = require('./package.json');
const isElectron = require('is-electron')();
const device = require('./utils/device');


/**
 * APP directories
 *
 * APP_ROOT
 * ├── src
 * ├── config       # Default configurations
 * ├── user
 * |    ├── config
 * |    ├── data
 * |    ├── var
 */

const APP_ROOT = path.dirname(path.resolve(__dirname));
const APP_SRC = path.join(APP_ROOT, 'src');
const APP_CONFIG = path.join(APP_ROOT, 'config');
const APP_USER = path.join(APP_ROOT, 'user');    // Portable use

// Check for portable setup
const isPortable = ! fs.existsSync(path.join(APP_USER, '.ignore'));


/**
 * USER Directories
 */

const USER_HOME = (isPortable) ? APP_USER : path.join(os.homedir(), '.canvas');
const USER_CONFIG = path.join(USER_HOME, 'config');
const USER_DATA = path.join(USER_HOME, 'data');
const USER_VAR = path.join(USER_HOME, 'var');

// Collect all ENV constants
const env = {
    APP: {
        name: (pkg.productName) ? pkg.productName : pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license,

        isElectron,
        isPortable,

        paths: {
            root: APP_ROOT,
            src: APP_SRC,
            config: APP_CONFIG,
            user: APP_USER,
        },
    },

    USER: {
        ...device.user,
        paths: {
            // TODO: Rework (to-be-done before OS integration)
            homedir: device.os.homedir,
            // desktop
            // downloads
            home: USER_HOME,
            config: USER_CONFIG,
            data: USER_DATA,
            var: USER_VAR,
        },
    },

    DEVICE: {
        id: device.id,
        endianness: device.endianness,
        os: device.os,
        network: device.network,
    },

    SERVER: {
        pid: path.join(USER_VAR, 'run', 'canvas-server.pid'),
        transports: {
            ipc: (process.platform === 'win32') ?
                path.join('\\\\?\\pipe', 'canvas-server.ipc') :
                process.env['CANVAS_SERVER_SOCK'] || path.join(USER_VAR, 'run', 'canvas-server.sock'),
        },
    },
};


/**
 * Exports
 */

module.exports = env;
