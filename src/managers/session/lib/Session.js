
// Utils
const EventEmitter = require('eventemitter2');
const debug = require('debug')('canvas:session-manager:session');


class Session {

    constructor(id, sessionOptions = {}, contextManager, sessionMap = new Map()) {
        if (!id) {throw new Error('Session ID required');}
        if (!sessionOptions.baseUrl) {throw new Error('Base URL required');}
        if (!contextManager) {throw new Error('Context manager required');}

        this.id = id;
        this.baseUrl = sessionOptions.baseUrl;
        this.contextManager = contextManager;

        debug(`Initializing session "${this.id}" with base URL "${this.baseUrl}"`);
        debug(`Session options: ${JSON.stringify(sessionOptions, null, 2)}`);

        this.contexts = new Map(); // Map of contexts for this session
        this.connectedDevices = sessionMap; // Map of connected devices for this session
        this.initializeContexts(sessionOptions?.contexts);
    }

    initializeContexts(contexts) {
        debug(`Initializing contexts for session "${this.id}"`);
        if (!contexts || Object.keys(contexts).length === 0) {
            debug(`No contexts for session "${this.id}" found, creating a default context`);
            let ctx = this.createContext(this.baseUrl, { sessionId: this.id, baseUrl: this.baseUrl });
            this.contexts.set(ctx.id, ctx);
            return;
        }

        for (let context in contexts) {
            let ctxConfig = contexts[context];
            ctxConfig.baseUrl = this.baseUrl;
            let ctx = this.createContext(ctxConfig.url, ctxConfig);
            this.contexts.set(ctx.id, ctx);
        }
    }

    // TODO: Temporary method to return a default session context
    getContext(id) {
        let context;

        if (!id) {
            context = (this.contexts.size > 0) ? this.contexts.values().next().value : this.createContext();
        } else {
            context = this.contexts.get(id);
            if (!context) {throw new Error(`Context with id ${id} not found`);}
        }

        return context;
    }

    listContexts() {
        return Array.from(this.contexts.values()).reduce((obj, context) => {
            obj[context.id] = context.stats(); // Testing
            return obj;
        }, {});
    }

    createContext(url, options) {
        let context = this.contextManager.createContext(url, options);
        this.contexts.set(context.id, context);
        return context;
    }

    removeContext(id) {
        let context = this.contexts.get(id);
        if (!context) {return false;}
        this.contextManager.removeContext(id);
        this.contexts.delete(id);
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            baseUrl: this.baseUrl,
            contexts: this.listContexts(),
        };
    }

}

module.exports = Session;
