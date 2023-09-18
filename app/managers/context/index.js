/**
 * Canvas Context manager
 */

// Environment
const { APP, USER, DEVICE } = require('../../env.js')

// Utils
const EventEmitter = require("eventemitter2");
const path = require("path");
const debug = require("debug")("canvas:context-manager")

// Lib includes
const Tree = require('./lib/Tree.js')
const LayerIndex = require('./lib/LayerIndex.js')
const TreeIndex = require('./lib/TreeIndex.js')
const Context = require('./lib/Context.js')


/**
 * Context Manager
 */

class ContextManager extends EventEmitter {


    constructor({

    }) {

        debug('Initializing Context Manager')

        // Initialize event emitter
        super({
            wildcard: false,            // set this to `true` to use wildcards
            delimiter: '/',             // set the delimiter used to segment namespaces
            newListener: false,         // set this to `true` if you want to emit the newListener event
            removeListener: false,      // set this to `true` if you want to emit the removeListener event
            maxListeners: 100,          // the maximum amount of listeners that can be assigned to an event
            verboseMemoryLeak: false,   // show event name in memory leak message when more than maximum amount of listeners is assigned
            ignoreErrors: false         // disable throwing uncaughtException if an error event is emitted and it has no listeners
        })

        // Initialize indexes
        this.layerIndex = new LayerIndex(path.join(USER.paths.home, 'layerIndex.json'))
        this.treeIndex = new TreeIndex(path.join(USER.paths.home, 'treeIndex.json'))
        this.activeContexts = new Map()

        // Initialize the global context tree for our universe
        this.tree = new Tree(this.layerIndex, this.treeIndex)

    }

    async createContext(url, options = {}) {
        let context = new Context(url, options)
        this.activeContexts.set(context.id, context)
        return context
    }

    async removeContext(id) {
        let context = this.activeContexts.get(id)
        if (context) {
            context.destroy()
            this.activeContexts.delete(id)
        }
    }

    listContexts() {
        return this.activeContexts.values()
    }

}

module.exports = ContextManager;




const cm = new ContextManager({

})
