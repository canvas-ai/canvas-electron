'use strict'


// Global bootstrap TODO:Rework
const { 
  DIR 
}               = require('../../bootstrap.js')

// Utils
const path      = require('path')
const log       = console.log // To replace with utils/log

// App
const vorpal    = require('vorpal')()
const fsAutocomplete = require('vorpal-autocomplete-fs')

// Config
const aliases   = require(path.join(DIR.CONFIG, 'aliases.json')) // TODO: Move under utils/config

// Bling bling
const print     = require('./renderer.js')
const chalk     = require('chalk')

const Client    = require('../../transport/net.ipc').Client
const client    = new Client()

client.connect()

client.on('ws', (data) => {
  log('======================')
  log(data)
  log('======================')
})

// Watch the utils folder
// onChange - re-require
var PS1 = `${chalk.bold.greenBright('na')} > $`

vorpal
  .delimiter(PS1)
  .show()

/*
wsm.on('enter', (newWorkspace) => {
  PS1 = `${chalk.bold.greenBright(newWorkspace.name)} > $`
  ws = wsm.workspace
  log(ws)
  vorpal
    .delimiter(PS1)
  }) 
  

vorpal
  .command('ws [action] [args...]', 'Workspace')
  .autocomplete(
    Object.getOwnPropertyNames(Object.getPrototypeOf(wsm))
      .filter(
        m => 'function' === typeof wsm[m]   // Methods only(TODO: getters/setters)
        && !m.toString().startsWith('_')    // Remove private methods
        && m.toString() !== ('constructor')
      )    
  )
  .option('-c --context <url>', 'Context URL for the executed command')  
  .action(function(input, callback) {
    
    let action = input.action || null
    let args = input.args || null
    let opts = input.options || null
    let data = null

    if (typeof wsm[action] === 'function') {
      let response = wsm[action] ({args ,opts, data})
      if (response) print({      
        template: 'workspaces',
        data: response,
        action: action,
        args: args, 
        opts: opts
      })
    }

    // Fallback to the current workspace
    if (typeof ws[action] === 'function') {
      let response = ws[action] ({args ,opts, data})
      if (response) print({
        template: 'workspace',
        data: response,
        action: action,
        args: args, 
        opts: opts
      })
    } else if (typeof ws[action] !== 'undefined') {
      log('Returning value from getter (fixme):')
      log(ws[action])
    }  

    callback()
})

vorpal
  .catch('[action] [args...]', 'Catches incorrect commands')
  .option('[]')
  .action(function (input, callback) {
    this.log(input)

    let action = input.action || null
    let args = input.args || null
    let opts = input.options || null
    let data = null    

    if (!action) {
      let response = wsm.list({args ,opts, data})
      if (response) print({      
        template: 'workspaces',
        data: response,
        action: action,
        args: args, 
        opts: opts
      })
      
    }

    if (typeof wsm[action] === 'function') {
      let response = wsm[action] ({args ,opts, data})
      if (response) print({      
        template: 'workspaces',
        data: response,
        action: action,
        args: args, 
        opts: opts
      })
    }    

    if (typeof ws[action] === 'function') {
      let response = ws[action] ({args ,opts, data})
      if (response) print({
        template: 'workspace',
        data: response,
        action: action,
        args: args, 
        opts: opts
      })

    }     

    if (typeof ws[action] === 'function') {
      let response = ws[action] ({args ,opts, data})
      if (response) print({
        template: 'workspace',
        data: response,
        action: action,
        args: args, 
        opts: opts
      })

    }     



    callback()
})

vorpal
  .command("ws destroy [id]")
  .action(function(args, cb){
    var self = this;
    this.prompt({
      type: "confirm",
      name: "continue",
      default: false,
      message: "That sounds like a really bad idea. Continue?",
    }, function(result){
      if (!result.continue) {
        self.log("Good move.");
        cb();
      } else {
        self.log("Time to dust off that resume.");
        cb()//app.destroyDatabase(cb);
      }
    });
  });


vorpal
  .command('cat [dirs...]')
  //.autocomplete(fsAutocomplete())
  .autocomplete(fsAutocomplete({directory: true}));

function parse(args) {

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
  log('Input')
  log('--------------------------')  
  log('Action:', action)
  log('Args:', args)
  log('Opts:', opts)
  log('Data:', data)
  log('--------------------------')  
  
  // Utility functions TODO: Move to commander(?)
  if (action == 'color' || action == 'colors') {
    wsm.colors.map(([index, c]) => { log(`${index} | ${chalk.hex(c)(c)}`) })
    return EXIT_CODES.SUCCESS
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

  // Parse opts


  // Fallback to the current workspace
  let ws = wsm.workspace //ctx.workspace
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

  // Fallback to storage abstractions
  let storage = ws.data
  if (typeof storage[action] === 'function') {
    let response = storage[action] ({args ,opts, data})    
    return (response) ? print({
      template: 'data',
      data: response,
      action: action,
      args: args, 
      opts: opts
    }) && EXIT_CODES.SUCCESS : EXIT_CODES.FAILED
  }

  // Fallback to default
  log(`Command "${primitive}" not implemented`)    
  return EXIT_CODES.FAILED

}*/