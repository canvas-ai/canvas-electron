'use strict';

//https://www.freecodecamp.org/news/do-you-want-a-better-understanding-of-buffer-in-node-js-check-this-out-2e29de2968e8/

// Utils
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const log = console.log;
const device = require('../../../context/env/device');


module.exports = function(fullPath, callback) {

    if (!fs.existsSync(fullPath)) {
        callback(`Path "${fullPath}" not found or not readable`, false);
    }

    let file = {};
    let stats = fs.statSync(fullPath); 
    file.fullPath = path.resolve(fullPath);
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
        log('Fallback to the unix file command wrapper');
        var mm = require('mime-magic'); // TO FORK + REWORK
        mm(fullPath, function (err, type) {
            if (err) {callback(err, null);}

            file.contentType = type;
            file.contentExt = mime.getExtension(file.contentType);
            callback(null, file);

        });
  
    } else {

        callback(null, file);

    }

};