'use strict'


/**
 * ------------------------------------------
 * CLI client for Canvas
 * c2023
 * ------------------------------------------
 */


/**
 * Imports
*/

// Environment variables
const {
    app,
    user,
    transport
} = require('../../env')


// NodeJS Utils
const path = require('path')

// App Utils
const config = require('../../utils/config')
const debug = require('debug')('canvas-cli')

// Bling-bling
const Table     = require('cli-table3')
const chalk     = require('chalk')

// Parts of the CLI logic taken from https://github.com/shelljs
// Copied from shx.js / shell.js
const EXIT_CODES = {
    ERROR: 87, // https://xkcd.com/221/
    FAILED: 1,
    SUCCESS: 0,
}

const exit = (code) => { process.exit(code); }
const aliases = {} // config.get('aliases')
const minimist  = require('minimist')

// Parse argv
const parsedArgs = minimist(process.argv.slice(2), {

    // Treat the following arguments as strings
    string: ['context','_'],

    // Set default command line aliases
    alias: {
        c: 'context',
        f: 'feature',
        s: 'filter',
        // Add user-defined aliases from config
        ...aliases
    }
})



/**
 * Static functions
 */

if (parsedArgs.v || parsedArgs.version) {
    printVersion()
    return EXIT_CODES.SUCCESS
}

if (parsedArgs.h || parsedArgs.help) {
    printHelp()
    return EXIT_CODES.SUCCESS
}


/**
 * Start the canvas application (temporarily, should be lazy-loaded)
*/

const Canvas = require('../../main')
let context = null

// Check if the canvas app is already running
if (Canvas.isRunning()) {
    // Initialize an RPC connection

} else {
    // Initialize the application locally
    const canvas = new Canvas()
    canvas.start()
    context = canvas.createContext()
}


/**
 * Main
*/

const run = async (input) => {
    // We use process.exitCode to ensure we don't terminate the process before
    // streams finish. See:
    //   https://github.com/shelljs/shx/issues/85
    process.exitCode = await parse(input, parsedArgs)
}

if (!process.stdin.isTTY) {
    let chunks = [];
    process.stdin.on('data', data => chunks.push(data));
    process.stdin.on('end', () => run(chunks.join('')));
} else {
    run(null);
}


/**
 * Parser logic
*/

async function parse(input, parsedArgs) {

    // Parse aliases
    if (parsedArgs['_'].length > 0) {
        let alias = parsedArgs['_'].join(' ')
        if (typeof aliases[alias] === 'string') {
            // This is rather primitive and needs to go away
            parsedArgs['_'] = aliases[alias].split(' ')
        }
    }

    // Parse the args array "_" to get the CLI "action"
    // Defaults to "list"
    let action = parsedArgs['_'][0] || null //'list'

    // Parse the context array
    // Providing context as a parameter won't change the global context
    let contextArray = []
    if (parsedArgs['context']) {
        contextArray = (typeof parsedArgs['context'] === 'string') ?
            [parsedArgs['context']] :
            parsedArgs['context']
    }

    // Parse the "features" array
    // Features are populated by the runtime itself when adding objects
    // Useful to specify an undetected feature or create a custom one.
    let featureArray = []
    if (parsedArgs['feature']) {
        featureArray = (typeof parsedArgs['feature'] === 'string') ?
            [parsedArgs['feature']] :
            parsedArgs['feature']
    }

    // Parse the "filters" array
    // Example: $0 notes -s datetime/today -s name/regexp/^foo/
    let filterArray = []
    if (parsedArgs['filter']) {
        filterArray = (typeof parsedArgs['filter'] === 'string') ?
            [parsedArgs['filter']] :
            parsedArgs['filter']
    }

    // Parse the rest of the supplied arguments
    let args = parsedArgs['_'].shift() && parsedArgs['_'] || null
    let opts = delete(parsedArgs['_']) && parsedArgs || null
    let data = input || null

    // To-be-removed
    debug('Parsed input parameters ------------------------')
    debug("Action:", chalk.green.bold(action))
    debug("contextArray:", contextArray)
    debug("featureArray:", featureArray)
    debug("filterArray:", filterArray)
    debug("Args:", args)
    debug("Opts:", opts)
    debug("Data:", data)
    debug('-------------------------------------------------')

    // Ugly way to get the method
    let method = (Array.isArray(args) && args.length > 0) ? args[0] && args.shift() : null
    let params = (Array.isArray(args) && args.length > 0) ? args[0] && args.shift() : null
    let result = []
    debug("Method:", method)
    debug("Params:", params)

    // Common CLI actions
    switch (action) {

        case 'alias': // TODO: Add support for setting an alias
        case 'aliases':
            console.table(config.get('aliases'))
            return EXIT_CODES.SUCCESS

        case 'color':
        case 'colors':
            // Get the current Canvas color theme
            const colors = config.get('colors')
            printColorTheme(colors)
            return EXIT_CODES.SUCCESS


        case null:
        case 'tree':
            console.log(`Current context: ${context.url}`)
            console.log(JSON.stringify(context.tree, null, 4));
            return EXIT_CODES.SUCCESS

        case 'ls':
        case 'list':
            result = await index.listDocuments(contextArray, featureArray)
            console.table(result)
            return EXIT_CODES.SUCCESS

        case 'db':
            const Db = require('./services/db')
            const db = new Db({
                path: path.join(user.home, 'db')
            })

            result = await db.test()
            console.table(result)
            return EXIT_CODES.SUCCESS

        case 'context':

            if (method === 'set' && params) {
                let res = context.set(params)
                if (res) {
                    console.log(`Context set to ${chalk.green.bold(res)}`)
                    return EXIT_CODES.SUCCESS
                } else {
                    console.log(`Unable to set context to ${chalk.red.bold(params)}`)
                    return EXIT_CODES.FAILED
                }
            }

            if (method === 'get-bitmap' && params) {
                let res = context.getContextBitmap(params)
                console.log(res)
            }

            if (method === 'list') {
                result = await context.listDocuments(contextArray, featureArray)
                console.table(result)
            }

            if (method === 'tree') {
                console.log(`Current context: ${context.url}`)
                context.printTree();
            }

            if (method === 'add' && !params) {
                let ctxPath = context.path
                const Document = require('./core/index/schema/Document')
                const doc = new Document({
                    type: 'data/abstraction/note',
                    data: `Inserted at ${ctxPath}`
                })

                context.insertDocument(doc, contextArray, featureArray)
            }

            return EXIT_CODES.FAILED

        default:
            console.log('req/res IPC CLient -> Server')
            return EXIT_CODES.SUCCESS

    }

}


/**
 * Utils to-be-moved to cli/utils.js
*/

function printColorTheme(colors) {

    for (const colorName in colors) {

        const color = colors[colorName];
        console.log(chalk.bold('Color') + '\t' + chalk.bold('Variation') + '\t' + chalk.bold('Hex'));

        // Loop through the color variations
        for (const variation in color) {
            const hex = color[variation];
            // Print the color name, variation, and hex value
            console.log(colorName + '\t' + variation + '\t' + chalk.hex(hex)(hex));
        }
    }

}

function printResult(data, context = null) {
    if (!data) return;
    //if (context) { console.log("Context: ", context.join('/')) }
    console.table(JSON.stringify(data, null, 2))
}

function printHelp() {
    console.log('Usage: ')
}

function printVersion() {
    console.log('Version:')
}
