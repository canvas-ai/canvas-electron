const fs = require('fs');

function isJson(input) {
    if (typeof input !== 'object' || input === null) {
        return false;
    }
    try {
        JSON.stringify(input);
        return true;
    } catch (err) {
        return false;
    }
}

function isFile(input) {
    if (typeof input !== 'string') return false;
    try {
        return fs.statSync(input).isFile();
    } catch (err) {
        return false;
    }
}

// https://github.com/juliangruber/isbuffer/blob/master/index.js
function isBuffer(input) {
    return Buffer.isBuffer(input);
}

function isBinary(input) {
    // Check if input is Buffer or ArrayBuffer or TypedArray
    return (
        isBuffer(input) ||
        (input instanceof ArrayBuffer) ||
        (ArrayBuffer.isView(input) && !(input instanceof DataView))
    );
}



module.exports = {
    isJson,
    isFile,
    isBuffer,
    isBinary,
};
