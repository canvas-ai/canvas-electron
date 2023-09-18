"use strict";


/**
 * Simple Config module for Canvas
 *
 * Usage:
 * const Config = require('./utils/config')
 * const config = Config({
 *  userConfigDir: 'path/to/user/config',
 *  appConfigDir: 'path/to/app/config',
 *  versioning: true,
 * })
 *
 * const myConfig = config.open('myConfig')
 *
 * The above will do the following
 * - Check if myConfig.<deviceid>.json exists in the user config dir
 * - Check if myConfig.<platform>.json exists in the user config dir
 * - Check if myConfig.json exists in the user config dir
 * - Check if myConfig.<deviceid>.json exists in the app config dir
 * - Check if myConfig.<platform>.json exists in the app config dir
 * - Check if myConfig.json exists in the app config dir
 * - If none of the above exist, create myConfig.json in the user config dir
 *
 */

const Conf = require("conf");
const fs = require("fs");
const path = require("path");
const device = require("../../managers/Device");

const findFile = (files) => {
    for (const file of files) {
        if (fs.existsSync(file)) {
            return file;
        }
    }
    return null;
};

const Config = (configOpts) => {

    return {
        open: (name) => {
            const filesToCheck = [
                path.join(configOpts.userConfigDir, `${name}.${device.id}.json`),
                path.join(configOpts.userConfigDir, `${name}.${device.os.platform}.json`),
                path.join(configOpts.userConfigDir, `${name}.json`),
                path.join(configOpts.appConfigDir, `${name}.${device.id}.json`),
                path.join(configOpts.appConfigDir, `${name}.${device.os.platform}.json`),
                path.join(configOpts.appConfigDir, `${name}.json`),
            ];

            const file = findFile(filesToCheck);

            if (!file) {
                const defaultFile = path.join(configOpts.userConfigDir, `${name}.json`);
                fs.mkdirSync(configOpts.userConfigDir);
                fs.writeFileSync(defaultFile, '{}', { encoding: 'utf-8' });
                return new Conf({ configName: name, cwd: configOpts.userConfigDir });
            } else {
                const dir = path.dirname(file);
                const baseName = path.basename(file, '.json');
                return new Conf({ configName: baseName, cwd: dir });
            }
        },
    };
};

module.exports = Config;
