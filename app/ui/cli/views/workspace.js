'use strict'

// Utils
const log       = console.log // To replace with utils/log
const Table     = require('cli-table3') 
const chalk     = require('chalk')

module.exports.print = function(opts) {

    let data = opts.data

    var table = new Table({
        head: [
            chalk.bold.green('ID'), 
            chalk.bold.green('Name'), 
            chalk.bold.green('Decription'), 
            chalk.bold.green('Color'), 
            chalk.bold.green('Status')
        ]
    })
    
      
    table.push([ 
        data.id, 
        data.name, 
        data.description, 
        chalk.hex(data.color)(data.color), 
        (data.status === 'not available') ? chalk.red(data.status) : chalk.green(data.status)
    ])

    log(table.toString())      

}