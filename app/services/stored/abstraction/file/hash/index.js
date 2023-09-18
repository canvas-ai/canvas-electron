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