'use strict';

//https://www.freecodecamp.org/news/do-you-want-a-better-understanding-of-buffer-in-node-js-check-this-out-2e29de2968e8/

// Utils
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const log = console.log;
const device = require('../../../context/env/device');

// Platform-dependend modules
if (device.os.platform === 'linux') {
    var mmmagic = (device.os.libc === 'glibc') ? 
        require(path.join(__dirname, 'mmmagic.linux.glibc/mmmagic')) : 
        require(path.join(__dirname, 'mmmagic.linux.musl/mmmagic'));

} else if (device.os.platform === 'win32') {
    var mmmagic = require(path.join(__dirname, 'mmmagic.win32/mmmagic'));
  
} else {
    log(`Platform ${device.os.platform} not implemented, program will now exit`);
    process.exit(1);
}


module.exports = function(fullPath, callback) {

    if (!fs.existsSync(fullPath)) {
        callback(`Path "${fullPath}" not found or not readable`, false);
    }

    let file = {};
    let stats = fs.statSync(fullPath); 
    file.fullPath = fullPath; //path.fileolve(fullPath)
    file.uid = stats['uid'];
    file.gid = stats['gid'];
    file.size = stats['size'];
    file.atime = stats['atime'];
    file.mtime = stats['mtime'];
    file.ctime = stats['ctime'];
    file.name = path.basename(fullPath);
    file.ext = path.extname(file.name).slice(1) || 'null'; //tofix
    file.contentType = mime.getType(fullPath);
    file.contentExt = mime.getExtension(file.contentType);

    if (!file.contentType || !file.contentExt) {
        log('Fallback to mmmagic');
        var Magic = mmmagic.Magic;
        var magic = new Magic(mmmagic.MAGIC_MIME_TYPE|mmmagic.MAGIC_CONTINUE);

        const fileType = require('file-type');
        const readChunk = require('read-chunk');
        const buffer = readChunk.sync(fullPath, 0, fileType.minimumBytes);
      
        /*
      magic.detectFile(fullPath, (err, result) => {
          if (err) throw err
          file.contentType = result
          file.contentExt = mime.getExtension(file.contentType)
          callback(null, file)        
      })*/

        magic.detect(buffer, (err, result) => {
            if (err) {throw err;}
            log(result);
            file.contentType = result;
            file.contentExt = mime.getExtension(file.contentType);
            callback(null, file);        
        });

  
    } else {

        callback(null, file);

    }

};