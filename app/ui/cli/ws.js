'use strict'


// Global bootstrap TODO:Rework
const { 
  DIR,
  IPC
}               = require('../../env.js')

// Utils
const path      = require('path')
const log       = console.log // To replace with utils/log
const _         = require('lodash')
const print     = require('./renderer.js')

/**
 * Copied from shx.js / shell.js
 */
const EXIT_CODES = {
    ERROR: 87, // https://xkcd.com/221/
    FAILED: 1,
    SUCCESS: 0,
}

// CLI I/O
const minimist  = require('minimist')
const parsedArgs = minimist(process.argv.slice(2)) 
const aliases   = require(path.join(DIR.config, 'aliases.json')) // TODO: Move under utils/config

// Bling bling
const Table     = require('cli-table3') 
const chalk     = require('chalk')

// App controller classes
// const ctx = require()  ctx.url('DXC/Zakaznici') ws = ctx.ws, data = ctx.data, data.file.add('/path/to/file')
// const wsm = require()
// 
// const ws = require()
// const data = require()

const wsm       = require(path.join(DIR.app, 'control', 'workspace'))
const run       = (stdin) => {
    // We use process.exitCode to ensure we don't terminate the process before
    // streams finish. See:
    //   https://github.com/shelljs/shx/issues/85  
    process.exitCode = parse(stdin, parsedArgs)
}


// ws shell
// ws run firefox --workspace DXC || --context DXC/policies/BSAB ?
if (!process.stdin.isTTY) {
    let chunks = []
    process.stdin.on('data', data => chunks.push(data))
    process.stdin.on('end', () => run(chunks.join('')))
  } else {
    run(null)
}

// ..a previous version of this function was very pretty
function parse(input, parsedArgs) {
  
  // Parse aliases
  if ((parsedArgs['_'].length > 0) && (typeof aliases[parsedArgs['_'][0]] === 'string')) {    
    let parsedAlias = minimist(aliases[parsedArgs['_'][0]].split(' '))
    parsedArgs = _.merge(parsedArgs, parsedAlias)
  }
  
  // Explode input vars TODO: Rework as this became pretty ugly recently
  let action = (parsedArgs['_'].length === 0) ? 'list' : parsedArgs['_'][0]
  let args = (parsedArgs['_'].shift() && parsedArgs['_']) || []
  let opts = delete(parsedArgs['_']) && parsedArgs
  let data = input || null

  // Debug only
  if (process.env['NODE_ENV'] == 'development' || opts.debug) {
    log('Input')
    log('--------------------------')  
    log('Action:', action)
    log('Args:', args)
    log('Opts:', opts)
    log('Data:', data)
    log('--------------------------')  
  }
  
  // Utility functions TODO: Use commander instead(?)
  if (action == 'color' || action == 'colors') {
    wsm.colors.map(([index, c]) => { log(`${index} | ${chalk.hex(c)(c)}`) })
    return EXIT_CODES.SUCCESS
  }

  if (action == 'alias' || action == 'aliases') {
    // alias add ff 'run firefox'
    log(aliases)
    return EXIT_CODES.SUCCESS
  }

  // Temporary - test
  if (action === 'set') {
    let ws = (opts && opts.workspace) ? wsm.getWorkspaceByName(opts.workspace) : wsm.getActiveWorkspace()
    log(ws)
    ws.set(args)
    return EXIT_CODES.SUCCESS
  }  

  // Temporary - test
  if (action === 'apps') {
    let apps = require('../control/apps')
    let response = apps.list()
    return (response) ? print({      
      template: 'apps',
      data: response,
      action: action,
      args: args, 
      opts: opts
    }) && EXIT_CODES.SUCCESS : EXIT_CODES.FAILED
  }    

  // Check if the supplied primitive should be routed to the ws management class
  if (typeof wsm[action] === 'function') {
    let response = wsm[action] ({args ,opts, data})
    return (response) ? print({      
      template: 'workspaces',
      data: response,
      action: action,
      args: args, 
      opts: opts
    }) && EXIT_CODES.SUCCESS : EXIT_CODES.FAILED
  }

  // Fallback to the current workspace
  let ws = wsm.getActiveWorkspace()
  if (typeof ws[action] === 'function') {
    let response = ws[action] ({args ,opts, data})
    return (response) ? print({
      template: 'workspace',
      data: response,
      action: action,
      args: args, 
      opts: opts
    }) && EXIT_CODES.SUCCESS : EXIT_CODES.FAILED
  }

  // Temporary
  if (action === 'config') {
    if (!args[0]) log(wsm.getActiveWorkspace())
    else log(wsm.getWorkspaceByName(args.join(" ")))
    return EXIT_CODES.SUCCESS
  }

  // Temporary
  if (action === 'run') {
    const apps = require('../control/apps')
    if (!args[0]) {
      log('No app name specified')
      log('Available apps:')
      log('--------------------------')  
      log(apps.list())
      return EXIT_CODES.FAILED
    }
    if (apps.run(args[0], true, 'ignore')) return EXIT_CODES.SUCCESS
    return EXIT_CODES.FAILED
  }

  // Fallback to storage built-in methods
  if (typeof storage[action] === 'function') {
    let response = ws[action] ({args ,opts, data})
    return (response) ? print({
      template: 'storage',
      data: response,
      action: action,
      args: args, 
      opts: opts
    }) && EXIT_CODES.SUCCESS : EXIT_CODES.FAILED    
  }

  // Fallback to storage abstractions
  if (typeof storage[action] === 'object') {
    let abstraction = storage[action]
    let method = args.shift() || '_defaultAction'  
    if (typeof abstraction[method] === 'function') {
      let response = abstraction[method] ({args ,opts, data})
      return (response) ? print({
        template: 'storage',
        data: response,
        action: action,
        args: args, 
        opts: opts
      }) && EXIT_CODES.SUCCESS : EXIT_CODES.FAILED  
    }
  }

  // Fallback to default
  log(`Command module for "${action}" not implemented`)    
  return EXIT_CODES.FAILED

}

function parseWsmOpts(input) {

  if (typeof input !== 'object') {
    log('Input needs to be of type object') 
    return false
  }

  let parsed = {
    id: input.opts.id || null,
    name: input.opts.name || input.args.join(' '),
    description: input.opts.description || null,
    color: input.opts.color || null    
  }

  if (!parsed.name) {
    log('Workspace name not specified') 
    return false
  }  

  return parsed

}
