'use strict';


// Credits for this one mostly chat.openai.com
const fs = require('fs');
const util = require('util');
const path = require('path');

// TODO: Use https://www.npmjs.com/package/write-file-atomic
const writeFile =  util.promisify(fs.writeFile);
const readFile =  util.promisify(fs.readFile);
const writeFileSync = fs.writeFileSync;
const readFileSync = fs.readFileSync;


class JsonMap extends Map {

    #initialized = false

    constructor(filePath) {

        if (!filePath || typeof filePath !== 'string') throw new Error('File path must be a string');
        super()

        this.filePath = path.extname(filePath) === '.json' ? filePath : filePath + '.json';
        this.dataRoot =  path.dirname(this.filePath)
        if (!fs.existsSync(this.dataRoot)){
            fs.mkdirSync(this.dataRoot, { recursive: true });
        }

        this.loadSync()

    }

    async set(key, value) {
        super.set(key, value);
        await this.saveSync();
    }

    setSync(key, value) {
        super.set(key, value);
        this.saveSync();
    }

    async delete(key) {
        super.delete(key);
        await this.saveSync();
    }

    deleteSync(key) {
        super.delete(key);
        this.saveSync();
    }

    async clear() {
        super.clear();
        await this.saveSync();
    }

    clearSync() {
        super.clear()
        this.saveSync();
    }

    async load() {
        try {
            const data = await readFile(this.filePath, 'utf8');
            const jsonData = JSON.parse(data)
            for (const [key, value] of jsonData) { super.set(key, value); }
            this.#initialized = true

        } catch (err) {
            if (err.code === 'ENOENT') {
                console.info(`The file ${this.filePath} does not exist, file will be created on first update`);
            } else {
                console.error(`An error occurred while loading the file: ${err}`);
                throw new Error(err);
            }
        }
    }

    loadSync() {
        try {
            const data = readFileSync(this.filePath, 'utf8');
            if (!data) return
            const jsonData = JSON.parse(data)
            for (const [key, value] of jsonData) { super.set(key, value); }
            this.#initialized = true

        } catch (err) {
            if (err.code === 'ENOENT') {
                console.info(`The file ${this.filePath} does not exist, file will be created on first update`);
            } else {
                console.error(`An error occurred while loading the file: ${err}`);
                throw new Error(err);
            }
        }
    }

    // TODO: Rewrite, inefficient to always rewrite the whole file
    // We don't need to use json here
    async save() {
        const mapAsJson = JSON.stringify([...this], null, 2);
        await writeFile(this.filePath, mapAsJson, { flag: 'w' });
    }

    // TODO: Rewrite, inefficient to always rewrite the whole file
    // We don't need to use json here
    saveSync() {
        const mapAsJson = JSON.stringify([...this], null, 2);
        writeFileSync(this.filePath, mapAsJson, { flag: 'w' });
    }

}

module.exports = JsonMap;
