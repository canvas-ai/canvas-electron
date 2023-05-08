'use strict'

/**
 * ------------------------------------------
 * 
 * cli client for canvasUI
 * c2022; <>
 * 
 * ------------------------------------------
 */

// Global bootstrap TODO:Rework
const { 
  DIR,
  pipe,
  APP_NAME,
  APP_VERSION,
}     = require('../env.js')

// Utils
const path      = require('path')

// Logging
const log       = require('../utils/log')('canvasui-cli', {logLevel: "debug"})

// CLI I/O
const minimist  = require('minimist')
const aliases   = require(path.join(DIR.config, 'aliases.json')) // TODO: Move under utils/config
const parsedArgs = minimist(process.argv.slice(2), { stopEarly: true, boolean: true })

// Bling bling
const Table     = require('cli-table3') 
const chalk     = require('chalk')

// Transports
const crocket   = require('crocket')

/**
 * Credit
 * https://github.com/shelljs
 */
const EXIT_CODES = {
    ERROR: 87, // https://xkcd.com/221/
    FAILED: 1,
    SUCCESS: 0,
}


/**
 * One-timers
 */
if (parsedArgs.v || parsedArgs.version) {
  version()
  return EXIT_CODES.SUCCESS
}

if (parsedArgs.h || parsedArgs.help) {
  help()
  return EXIT_CODES.SUCCESS
}

if (parsedArgs.clear) {
  clear()
  return EXIT_CODES.SUCCESS
}



const run = (stdin) => {
  // We use process.exitCode to ensure we don't terminate the process before
  // streams finish. See:
  //   https://github.com/shelljs/shx/issues/85  
  process.exitCode = parse(stdin, parsedArgs)
}

// Main entry point
if (!process.stdin.isTTY) {
  // Read all stdin first (FIX)
  let chunks = []
  process.stdin.on('data', data => chunks.push(data))
  process.stdin.on('end', () => run(chunks.join('')))
} else { 
  // There's no stdin
  run(null) 
}

/*
__/\\\________/\\\__/\\\\\\\\\\\_____/\\\\\\\\\\\_______/\\\\\\\\\\\___        
 _\/\\\_____/\\\//__\/////\\\///____/\\\/////////\\\___/\\\/////////\\\_       
  _\/\\\__/\\\//_________\/\\\______\//\\\______\///___\//\\\______\///__      
   _\/\\\\\\//\\\_________\/\\\_______\////\\\___________\////\\\_________     
    _\/\\\//_\//\\\________\/\\\__________\////\\\___________\////\\\______    
     _\/\\\____\//\\\_______\/\\\_____________\////\\\___________\////\\\___   
      _\/\\\_____\//\\\______\/\\\______/\\\______\//\\\___/\\\______\//\\\__  
       _\/\\\______\//\\\__/\\\\\\\\\\\_\///\\\\\\\\\\\/___\///\\\\\\\\\\\/___ 
        _\///________\///__\///////////____\///////////_______\///////////_____
*/

function parse(stdin, parsedArgs) {
  
  // Parse aliases  
  if (parsedArgs['_'].length > 0) {
    let alias = parsedArgs['_'].join(' ') // TODO: Test with per-arg basis (ws run ff and ws app ff                                           // would work with a single ff => firefox alias)
    if (typeof aliases[alias] === 'string') {
      parsedArgs['_'] = aliases[alias].split(' ') // This is rather primitive and needs to go away
    }
  }
  
  /**
   * Parse input vars
   */
  let action = (parsedArgs['_'].length > 0) ? 
    parsedArgs['_'][0] : // 
    'list' // fallback action (could be a _defaultAction method on each module instead)

  let args = (parsedArgs['_'].shift() && parsedArgs['_']) || []
  let opts = delete(parsedArgs['_']) && parsedArgs
  let data = stdin || null

  log.debug('SCRIPT Input:')
  log.debug('Action:', action)
  log.debug('Args:', args)
  log.debug('Opts:', opts)
  log.debug('Data:', data) 

  // Pass to app via IPC
  const client    = new crocket()
  client.connect({
      "path": "/tmp/node-crocket.sock",
      "host": null,
      "port": null,
      "reconnect": 1,
      "timeout": 5000,
      "encoding": "utf8"
    }, (e) => { 
    
      if(e) throw e; 

      // Instantly a message to the server
      client.emit('/request', {
        action: action,
        args: args,
        opts: opts,
        data: data
      })
  })
  
  client.on('/response', (res) => {
    console.log(res)
    client.close();
  })
 
}


/**
 * Utility functions
 */

function version() { print(`${APP_NAME} ${APP_VERSION}`) }

function help() { print('help') }

function clear() {
  process.stdout.write('\x1b[2J') // Clear screen
  process.stdout.write('\x1b[0f') // Move cursor to 0,0
}

function header() {
  log(`User: ${chalk.bold(device.user.username)} (UID:${device.user.uid}|GID:${device.user.gid}|SHELL:${device.user.shell})`)
  log(`Device: ${chalk.bold(device.id)} ${device.os.arch} ${device.endianness}`)
  log(`OS: ${chalk.bold(device.os.platform + "_" + device.os.arch)} v${device.os.release} (libc:${device.os.libc})`)
  log(`NW: ${chalk.bold(device.os.hostname + "@" + device.network.address)}`)
  log(`Context: ${chalk.hex('#cf2528').bold(ws.name)}`)
}

function footer() {
  log(`User: ${chalk.bold(device.user.username)} (UID:${device.user.uid}|GID:${device.user.gid}|SHELL:${device.user.shell})`)
  log(`Device: ${chalk.bold(device.id)} ${device.os.arch} ${device.endianness}`)
  log(`OS: ${chalk.bold(device.os.platform + "_" + device.os.arch)} v${device.os.release} (libc:${device.os.libc})`)
  log(`NW: ${chalk.bold(device.os.hostname + "@" + device.network.address)}`)

}

function ping() {}

// TODO
// https://github.com/shelljs/shx/blob/master/src/printCmdRet.js
function print(msg) { console.log(msg) }

function checkSocketFile(sock) {

  fs.stat(sock, (err, stats) => {
    console.log('Removing leftover socket.')
    fs.unlink(sock, (err) => {
        if(err) { console.error(err); process.exit(0) }
    })
  })
  
}