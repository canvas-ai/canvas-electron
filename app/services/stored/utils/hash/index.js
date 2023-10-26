'use strict'

// Lib
const crypto    = require('crypto')
const fs    = require('fs')

// Exports
module.exports.list = crypto.getHashes()

module.exports = function(str, algorithm, encoding) {
  return crypto
    .createHash(algorithm || 'sha1')
    .update(str, 'utf8')
    .digest(encoding || 'hex')
}

module.exports.demo = function() {

  let t = crypto.getHashes()
  let testString1 = 'totojelent3str1ng'
  let testString2 = 'totojelent3str2ng'

  t.forEach((h) => {

    let r0 = hash("", h)
    let r1 = hash(testString1, h)
    let r2 = hash(testString2, h)
    console.log(`${r0.length} | ${h}(""): ${r0}`)
    console.log(`${r1.length} | ${h}("${testString1}"): ${r1}`)
    console.log(`${r2.length} | ${h}("${testString2}"): ${r2}`)

  })

}

module.exports.checksumFile = function(path, algorithm = 'sha1', encoding = 'hex') {
  return new Promise((resolve, reject) => {
    let hash = crypto.createHash(algorithm);
    let stream = fs.createReadStream(path);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest(encoding)));
  });
}


function generateChecksum(filePath) {
  // read the file
  const fileData = fs.readFileSync(filePath);

  // create a hash
  const hash = crypto.createHash('sha256')
    .update(fileData)
    .digest('hex');

  // return the checksum
  return hash;
}


const xxhash = require('xxhash');

function generateXXHash(filePath) {
  // read the file
  const fileData = fs.readFileSync(filePath);

  // create a hash
  const hash = xxhash.hash(fileData, 0xABCD);

  // return the xxhash
  return hash;
}


/*

const fs = require('fs');
const XXH = require('xxhashjs');

const hashIndex = {};

fs.readdir('/path/to/files', (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    fs.readFile(`/path/to/files/${file}`, (err, data) => {
      if (err) throw err;

      const hash = XXH.h32(data, 0xABCD).toString(16);
      hashIndex[hash] = file;
    });
  });
});

const fs = require('fs');
const XXH = require('xxhashjs');

class HashTable {
  constructor() {
    this.table = {};
  }

  put(key, value) {
    const hash = XXH.h32(key, 0xABCD).toString(16);
    this.table[hash] = value;
  }

  get(key) {
    const hash = XXH.h32(key, 0xABCD).toString(16);
    return this.table[hash];
  }
}

const hashIndex = new HashTable();

fs.readdir('/path/to/files', (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    fs.readFile(`/path/to/files/${file}`, (err, data) => {
      if (err) throw err;

      hashIndex.put(data, file);
    });
  });
});

*/
