'use strict'


// Utils
const log       = console.log // To replace with utils/log
const device    = require('../../utils/device')
const chalk     = require('chalk')

// Config
const DIR_VIEWS = './views'

// Main proxy class, does not do much
module.exports = function(opts = {}) {

    try {
        var template = require(`${DIR_VIEWS}/${opts.template}.js`)
    } catch (e) {
        log(`No template for "${opts.template}" found, data printed in raw format`)
        var template = this
    }

    template.print(opts)
    
}

function print(opts) {
    log (opts)
}

function clearTerminal() {
    process.stdout.write('\x1b[2J') // Clear screen
    process.stdout.write('\x1b[0f') // Move cursor to 0,0
}
  
function printHeader() {
    log(`User: ${chalk.bold(device.user.username)} (UID:${device.user.uid}|GID:${device.user.gid}|SHELL:${device.user.shell})`)
    log(`Device: ${chalk.bold(device.id)} ${device.os.arch} ${device.endianness}`)
    log(`OS: ${chalk.bold(device.os.platform + "_" + device.os.arch)} v${device.os.release} (libc:${device.os.libc})`)
    log(`NW: ${chalk.bold(device.os.hostname + "@" + device.network.address)}`)
    log(`Context: ${chalk.hex('#cf2528').bold(ws.name)}`)
}
  
function footer() {
    log('------- ------- -------')
    log(`User: ${chalk.bold(device.user.username)} (UID:${device.user.uid}|GID:${device.user.gid}|SHELL:${device.user.shell})`)
    log(`Device: ${chalk.bold(device.id)} ${device.os.arch} ${device.endianness}`)
    log(`OS: ${chalk.bold(device.os.platform + "_" + device.os.arch)} v${device.os.release} (libc:${device.os.libc})`)
    log(`NW: ${chalk.bold(device.os.hostname + "@" + device.network.address)}`)

}

function printHelp() {}
