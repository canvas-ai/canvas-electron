// Utils
const EventEmitter = require('eventemitter2');

// App includes
const Context = require('./lib/Context');
const Tree = require('./lib/Tree');

// Module defaults
const MAX_CONTEXTS = 1024; // 2^10
const CONTEXT_AUTOCREATE_LAYERS = true;
const CONTEXT_URL_PROTO = 'universe';
const CONTEXT_URL_BASE = '/'


// Sessions
// Each session has its own context(one) and a single control interface
// meaning, switching your context on a session
// connected work-phone will automatically switch it on your work PC assuming its connected to the same session
// Sessions are decoupled from workspaces

// Workspaces
// universe://foo/bar/baz - Base URL / (universe)
// work://work - Base URL set to /work (navigation/data only from the /work subtree)
// customera://work/cusotmera - Base URL set to /work/customerA (navigation/data only from the /work/customerA subtree)
// home://home < Base URL set to /home (navigation/data only from the /home subtree)

// Contexts
// Described elsewhere already
// A client application can (optionally) submit a client context in the context array
// Format is client/os/linux, client/user/user1, client/app/obsidian, client/network/172.16.2.0%24
// This is very useful for calculating optimal routes for resources
// Retrieving file123.mp3 while sitting at home may fetch it from your home NAS, but use your s3 backend
// while you are on mobile network sitting on a train on your way to work


class ContextManager extends EventEmitter {

    #index;
    #db;
    #data;
    #tree;
    #layers;
    #baseUrl;

    constructor(options = {}) {
        super(); // EventEmitter

        // Validate options
        if (!options.index) { throw new Error('Index not provided'); }
        if (!options.data) { throw new Error('Data not provided'); }

        // Module options
        this.#index = options.index;
        this.#db = options.db;
        this.#data = options.data;
        this.#tree = new Tree({

        });


        // System context

        // Client context (supplied on client application logon)

        this.#layers = this.#tree.layers;
        this.#baseUrl = options.baseUrl || CONTEXT_URL_BASE;
        this.activeContexts = new Map();


    }

    get tree() { return this.#tree; }
    get layers() { return this.#layers; }

    createContext(url, options = {}) {
        if (this.activeContexts.size >= MAX_CONTEXTS) {
            throw new Error('Maximum number of contexts reached');
        }

        let context;

        // If a context with the same id already exists, return it instead of creating a new one
        if (options.id && this.activeContexts.has(options.id)) {
            let context = this.activeContexts.get(options.id);
            // Change the url if a url is supplied
            if (url != context.url) {context.set(url);}
            return context;
        }

        // Create a new context
        context = new Context(url, this.#db, this.#tree, options);
        this.activeContexts.set(context.id, context);

        return context;
    }

    // TODO: Temporary method to return a default context
    getContext(id) {
        let context;

        if (!id) {
            // This is another ugly workaround till full session support is implemented
            context = (this.activeContexts.size > 0) ? this.activeContexts.values().next().value : this.createContext();
        } else {
            context = this.activeContexts.get(id);
            if (!context) {throw new Error(`Context with id "${id}" not found`);}
        }

        return context;
    }

    listContexts() {
        return Array.from(this.contexts.values());
    }

    removeContext(id) {
        const context = this.activeContexts.get(id);
        if (!context.destroy()) {
            log.error(`Error destroying context ${id}`); // Throw?
            return false;
        }

        this.activeContexts.delete(id);
        log.info(`Context with id ${id} closed`);
        return true;
    }

}

module.exports = ContextManager;
