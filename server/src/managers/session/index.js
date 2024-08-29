// Utils
const EventEmitter = require('eventemitter2');
const debug = require('debug')('canvas:session-manager');

// Includes
const Session = require('./lib/Session');

// Defaults
const MAX_SESSIONS = 32; // 2^5
const MAX_CONTEXTS_PER_SESSION = 32; // 2^5
const SESSION_DEFAULT_ID = 'default';
const CONTEXT_AUTOCREATE_LAYERS = true;
const CONTEXT_URL_PROTO = 'universe';
const CONTEXT_URL_BASE = '/';
const CONTEXT_URL_BASE_ID = 'universe';

/**
 * Session manager
 */

/**
 * Session Manager
 *  - Session (foo)
 *      - ContextManager (TODO: Refactor/review)
 *          - Context
 *  - Session (bar)
 *      - ContextManager (TODO: Refactor/review)
 *          - Context
 */

class SessionManager extends EventEmitter {

    #maxSessions;
    #maxContextsPerSession;
    #baseUrl; // Might be useful for future use cases

    constructor(options = {}) {
        super();
        debug('Initializing Session Manager');

        if (!options.sessionStore) {
            throw new Error('Session store required');
        }

        if (!options.contextManager) {
            throw new Error('Context manager required');
        }

        this.sessionStore = options.sessionStore; // Map-like (sync) interface, at some point we'll need to get rid of it
        this.contextManager = options.contextManager;

        this.#maxSessions = options.maxSessions || MAX_SESSIONS;
        this.#maxContextsPerSession = options.maxContextsPerSession || MAX_CONTEXTS_PER_SESSION;

        // TODO: Refactor to use nested maps and serialize/deserialize to/from the session store
        // sessionID -> Map() which gets forwarede to the session object
        // deviceID -> device object within the session object to track
        // which devices are connected to the session
        this.sessions = new Map();
    }

    getSession(id) {
        let session;

        if (!id || id === null) {
            debug('No session ID provided, initializing a default session');
            session = this.createSession(SESSION_DEFAULT_ID);
        } else {
            session = this.openSession(id);
            if (!session) {throw new Error(`Session with id "${id}" not found`);}
        }

        return session;
    }

    createSession(id = 'default', sessionOptions = {}) {
        id = (!id || id === null) ? 'default' : id;
        if (this.sessions.size >= this.#maxSessions) { throw new Error('Maximum number of sessions reached'); }
        if (sessionOptions.baseUrl === undefined) { sessionOptions.baseUrl = CONTEXT_URL_BASE; }

        // TODO: Refactor adhering to the single-responsibility principle

        debug(`Creating session: ${id}`);
        // TODO: Add support for updating context/session options
        if (this.#isSessionOpen(id)) {
            debug(`Session id "${id}" already exists and is active`);
            return this.sessions.get(id);
        }

        if (this.sessionStore.has(id)) {
            debug(`Session id "${id}" already exists in session store`);
            return this.openSession(id);
        }

        const session = new Session(id, sessionOptions, this.contextManager); // ugly, the whole thing but this in particular
        this.sessions.set(id, session);
        this.#saveSessionToDb(session);

        debug(`Session id "${id}" created, sessionOptions: ${JSON.stringify(sessionOptions)}`);
        this.emit('session-created', id); // Maybe I should return session instead, we'll see

        return session;
    }

    listActiveSessions() {
        return this.sessions.values();
    }

    async listSessions() {
        // TODO: Implement a combined list of active and stored sessions
        const sessions = await this.sessionStore.values(); // this is an async method
        console.log(sessions);
        return sessions;
    }

    openSession(id, autoInitSession = true) {
        if (!id || id === null) {
            debug('No session ID provided, returning the default session');
            return this.openSession(SESSION_DEFAULT_ID);
        }

        debug(`Trying to open session "${id}"`);
        if (this.#isSessionOpen(id)) {
            debug(`Session ID "${id}" found and is active`);
            return this.sessions.get(id);
        }

        if (!this.sessionStore.has(id)) {
            debug(`Session ID "${id}" not found in session store`);
            return (autoInitSession) ? this.createSession(id) : false;
        }

        let sessionConfig = this.#loadSessionFromDb(id);
        let session = new Session(id, sessionConfig, this.contextManager);
        this.sessions.set(id, session);

        debug(`Session id "${id}" opened`);
        this.emit('session-opened', id);

        return session;
    }

    closeSession(id, autoSave = true) {
        debug(`Closing session: ${id}`);
        if (!this.#isSessionOpen(id)) {
            debug(`Session id "${id}" not found or already closed`);
            return false;
        }

        if (autoSave) { this.#saveSessionToDb(id); }

        let session = this.sessions.get(id);
        session.close();
        this.sessions.delete(id);

        debug(`Session id "${id}" closed`);
        this.emit('session-closed', id);

        return id;
    }

    deleteSession(id) {
        debug(`Deleting session: ${id}`);
        if (this.#isSessionOpen(id)) { // Maybe we should just return false here
            debug(`Session id "${id}" active, attempting to close it`);
            if (this.closeSession(id)) {
                throw new Error('Error closing session');
            }
        }

        if (!this.sessionStore.has(id)) {
            debug(`Session id "${id}" not found in session store`);
            return false;
        }

        if (!this.#deleteSessionFromDb(id)) {
            throw new Error('Error deleting session from DB');
        }

        debug(`Session id "${id}" deleted`);
        this.emit('session-deleted', id);

        return id;
    }

    async saveSessions() {
        for (let session of this.sessions.values()) {
            await this.#saveSessionToDb(session);
        }
    }


    /**
     * Internal methods
     */

    #isSessionOpen(id) {
        return this.sessions.has(id);
    }

    #saveSessionToDb(session) {
        debug(`Saving session "${session.id}" to DB`);
        let json = session.toJSON();
        return this.sessionStore.set(session.id, json); // sync
    }

    #loadSessionFromDb(id) {
        debug(`Loading session "${id}" from DB`);
        let json = this.sessionStore.get(id);
        if (!json) {
            debug(`Session id "${id}" not found in session store`);
            return false;
        }
        return json;
    }

    #deleteSessionFromDb(id) {
        debug(`Deleting session "${id}" from DB`);
        return this.sessionStore.delete(id);    // sync
    }
}

module.exports = SessionManager;
