'use strict';


// Credits for this one mostly chat.openai.com
const fs = require('fs');
const util = require('util');
const path = require('path');

// TODO: Use https://www.npmjs.com/package/write-file-atomic
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const writeFileSync = fs.writeFileSync;
const readFileSync = fs.readFileSync;


class JsonSet {

    constructor(filePath) {
        if (!filePath || typeof filePath !== 'string') {throw new Error('File path must be a string');}
        this.filePath = path.extname(filePath) === '.json' ? filePath : filePath + '.json';
        this.dataRoot =  path.dirname(this.filePath);
        if (!fs.existsSync(this.dataRoot)){
            fs.mkdirSync(this.dataRoot, { recursive: true });
        }
        this.set = this.loadSync();
    }

    async add(value) {
        this.set.add(value);
        await this.save();
    }

    addSync(value) {
        this.set.add(value);
        this.saveSync();
    }

    async delete(value) {
        this.set.delete(value);
        await this.save();
    }

    deleteSync(value) {
        this.set.delete(value);
        this.saveSync();
    }

    async load() {
        try {
            const data = await readFile(this.filePath, 'utf-8');
            const items = JSON.parse(data);
            return new Set(items);

        } catch (error) {
            console.error(`Error loading file: ${error.message}`);
            return new Set();
        }
    }

    loadSync() {
        try {
            const data = readFileSync(this.filePath, 'utf-8');
            const items = JSON.parse(data);
            return new Set(items);

        } catch (error) {
            console.error(`Error loading file: ${error.message}`);
            return new Set();

        }
    }

    async save() {
        const data = JSON.stringify([...this.set]);
        await writeFile(this.filePath, data, 'utf-8');
    }

    saveSync() {
        const data = JSON.stringify([...this.set]);
        writeFileSync(this.filePath, data, 'utf-8');
    }

    toArray() {
        return [...this.set];
    }

}


module.exports = JsonSet;
