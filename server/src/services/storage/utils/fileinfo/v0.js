'use strict';

//https://github.com/bevry/istextorbinary
//https://www.freecodecamp.org/news/do-you-want-a-better-understanding-of-buffer-in-node-js-check-this-out-2e29de2968e8/

// Utils
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const log = console.log;

module.exports = function(fullPath, forceContentType = false, followSymlinks = true) {

    if (!fs.existsSync(fullPath)) {
        // TOFIX
        log(`Path "${fullPath}" not found or not readable`);
        return null;
    }

    let res = {};
    res.fullPath = fullPath; //path.resolve(fullPath)
    
    let stats = fs.statSync(fullPath); 
    res.uid = stats['uid'];
    res.gid = stats['gid'];
    res.size = stats['size'];
    res.atime = stats['atime'];
    res.mtime = stats['mtime'];
    res.ctime = stats['ctime'];
    res.name = path.basename(fullPath);
    log(`debug fullPath:${fullPath}`);
    log(`debug res.name path.basename(fullPath): ${res.name}`);
    res.ext = path.extname(res.name).slice(1) || 'na'; //tofix
    log(`debug res.ext path.extname(res.name).slice(1): ${res.ext}`);
    res.contentType = mime.getType(fullPath);
    res.contentExt = mime.getExtension(fullPath) || 'na'; //tofix

    // TOFIX
    if (res.contentType === null) {
        const fileType = require('file-type');
        const readChunk = require('read-chunk');
        const buffer = readChunk.sync(fullPath, 0, fileType.minimumBytes);
        const isBinaryFileSync = require('isbinaryfile').isBinaryFileSync;

        if (!isBinaryFileSync(buffer)) {

            res.contentType = 'text/plain';
            if (!res.contentExt) { res.contentExt = 'txt'; }

        } else {

            let ct = fileType(buffer);

            if (typeof ct === 'undefined') {
                res.contentType =  'application/octet-stream';
                res.contentExt =  path.extname(res.name).slice(1) || 'na';
    
            } else {
                res.contentType = ct.mime;
                res.contentExt = ct.ext || 'bin';
            }

        }

    }

    return res;   

};