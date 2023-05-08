'use strict'

// Utils
const crypto = require('crypto')
const Packer = require('amp-message')

/**
 * Credits:
 * https://github.com/nodexo/xpipe/blob/master/index.js
 * @param {*} path
 * @returns
 */
function xpipe(path) {
    let prefix = process.platform === 'win32' ? '//./pipe/' : ''
    if (prefix.endsWith('/') && path.startsWith('/')) {
        return prefix + path.substr(1)
    }
    return prefix + path
}

function msgPack(msg) {
    let packer = new Packer
    packer.push(msg)
    return packer.toBuffer()
}

function msgUnpack(msg) {
    //TODO: Review the [0] part, was a quick fix
    return new Packer(msg).args[0]
}

function uuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16))
}

function uuid12() {
    return ([1e3]+-1e3+-1e3).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16))
}

function genUUID() {
    return uuid12()
}

module.exports = {
    xpipe,
    msgPack,
    msgUnpack,
    uuid,
    uuid12,
    genUUID,
    isValidUrl
}
