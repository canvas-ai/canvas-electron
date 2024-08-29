'use strict';

//https://www.freecodecamp.org/news/do-you-want-a-better-understanding-of-buffer-in-node-js-check-this-out-2e29de2968e8/

// Utils
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const log = console.log;


// TODO add win32 bins
const cp = require('child_process');
const fileExec = '/usr/bin/file';
const magicFile = '/usr/share/misc/magic.mgc';
var fileFlags = ['--magic-file', magicFile, '--brief', '--mime-type'];

module.exports = async function(fullPath) {

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Path "${fullPath}" not found or not readable`);
    }

    let file = {};
    let stats = fs.statSync(fullPath);
    file.path = path.resolve(fullPath);
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
        file.contentType = getMimeTypeSync(fullPath);
        file.contentExt = mime.getExtension(file.contentType);
    }

    return file;

};

function getMimeType(file, cb) {
    cp.execFile(fileExec, fileFlags.concat(Array.isArray(file) ? file : [file]), function (err, stdout) {
        stdout = stdout.trim();
        if (err) {
            if (stdout) {
                err.message = stdout;
            }
            cb(err);
        } else {
            cb(null, Array.isArray(file) ? stdout.split(/\r\n|\n|\r/) : stdout);
        }
    });
}

function getMimeTypeSync(file) {
    let res = cp.execFileSync(fileExec, fileFlags.concat(Array.isArray(file) ? file : [file]), {encoding: 'utf8'});
    return res.replace('\n', '');
}

