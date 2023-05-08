'use strict'

// Utils
const log       = console.log // To replace with utils/log
const Table     = require('cli-table3') 
const chalk     = require('chalk')


function printRaw(data) {
  if (!data) return false
  log(data)
}

function printList(data, clearTerminal = false) {

    if (!data) return false
    if (clearTerminal) clearTerminal()
  
    var table = new Table({
      head: [
        chalk.bold.green('ID'), 
        chalk.bold.green('Name'), 
        chalk.bold.green('Decription'), 
        chalk.bold.green('Color'), 
        chalk.bold.green('Status')
      ]
    })
  
    Object.values(data).forEach((entry) => {    
      table.push([ 
        entry.id, 
        entry.name, 
        entry.description, 
        chalk.hex(entry.color)(entry.color), 
        (entry.status === 'not available') ? chalk.red(entry.status) : chalk.green(entry.status)
      ])
    })
  
    log(table.toString())
  
  }

module.exports.print = function(opts) {
      
    if (!opts) return false
    if (!opts.action) printRaw(opts.data)
    
    switch(opts.action) {
      case 'list': printList(opts.data)
    }   
  
}