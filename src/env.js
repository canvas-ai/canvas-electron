import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const APP_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isPortable = () => fs.existsSync(path.join(APP_ROOT, 'user', '.portable'));

// Utils
const createPathConfig = (base, paths) =>
    Object.fromEntries(
        paths.map(([key, subpath]) => [
            key,
            process.env[key] || path.join(base, subpath)
        ])
    );

const getUserHome = () => {
    if (isPortable()) {
        return path.join(APP_ROOT, 'user');
    }
    return path.join(
        os.homedir(),
        process.platform === 'win32' ? 'Canvas' : '.canvas'
    );
};

// Determine user home directory
const USER_HOME = process.env.CANVAS_USER_HOME || getUserHome();

// Env path configuration
const config = {
    // Runtime settings
    CANVAS_APP_ROOT: APP_ROOT,
    CANVAS_APP_PORTABLE: isPortable(),
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

    /**
     * User directories
     *
     * USER_HOME
     * ├── config
     * ├── cache
     * ├── data
     * |    ├── index
     * |    ├── db
     * ├── workspaces
     *      ├── universe
     *          ├── .workspace.json
     *          ├── index
     *      ├── foo
     */
    ...createPathConfig(USER_HOME, [
        ['CANVAS_USER_HOME', ''],
        ['CANVAS_USER_CONFIG', 'config'],
        ['CANVAS_USER_CACHE', 'cache'],
        ['CANVAS_USER_DATA', 'data'],
        ['CANVAS_USER_WORKSPACES', 'workspaces']
    ]),
};

// Load and manage .env file
const envPath = path.join(APP_ROOT, '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error || !Object.keys(envResult.parsed || {}).length) {
    const envContent = Object.entries(config)
        .map(([key, value]) => `${key}="${value}"`)
        .join('\n');

    fs.writeFileSync(envPath, envContent);
    dotenv.config({ path: envPath });
}

// Ensure all config values are in process.env
Object.entries(config).forEach(([key, value]) => {
    process.env[key] = process.env[key] || value;
});

export default config;
