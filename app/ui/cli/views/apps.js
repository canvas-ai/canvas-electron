'use strict'

// Utils
const log       = console.log // To replace with utils/log
const Table     = require('cli-table3') 
const chalk     = require('chalk')

module.exports.print = function(opts) {
      
  if (!opts.action) printRaw(opts.data)
  printList(opts.data)  

}

function printRaw(data) {
  log(data)
}

function printList(data, clearTerminal = false) {

    if (clearTerminal) clearTerminal()  

    var table = new Table({
      head: [
        chalk.bold.green('Name'), 
        chalk.bold.green('Type'), 
        chalk.bold.green('Context')
      ]
    })
  
    Object.entries(data).forEach((k) => {
      table.push([ 
        k[0], 
        k[1].type,
        k[1].context
      ])    
    })
  
    log(table.toString())
  
  }