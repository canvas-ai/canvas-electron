// Utils
const debug = require('debug')('canvas:transports:http:socketio');

// Routes
// TODO: Rework, this does not make logical sense as versioning can be defined in the routes.js file
//const sessionRoutes = require('./routes/v1/session');
const contextRoutes = require('./routes/v1/context.js');
const documentsRoutes = require('./routes/v1/documents.js');
const ROUTES = require('./routes.js');
const ResponseObject = require('../../../schemas/transport/responseObject.js');

module.exports = (io, parent) => {
    debug('Initializing socket.io routes');
    io.on('connection', (socket) => {
        debug(`Client connected: ${socket.id}`);
        socket.sessionManager = parent.sessionManager;
        socket.session = parent.session; // Default session
        socket.context = parent.context; // Default context

        contextRoutes(socket);
        documentsRoutes(socket, parent.db);

        socket.on(ROUTES.SESSION_LIST, async (data, callback) => {
            debug(`${ROUTES.SESSION_LIST} event`);
            debug(`Data: ${JSON.stringify(data)}`);
            if (typeof data === 'function') { callback = data; }
            const sessions = await socket.sessionManager.listSessions();
            const response = new ResponseObject();
            callback(response.success(sessions).getResponse());
        });

        socket.on(ROUTES.SESSION_CREATE, (sessionId, sessionOptions, callback) => {
            debug(`${ROUTES.SESSION_CREATE} event`);
            debug(`Session ID: ${sessionId}, Options: ${JSON.stringify(sessionOptions)}`);
            socket.session = socket.sessionManager.createSession(sessionId, sessionOptions);
            socket.context = socket.session.getContext(); // Returns default session context
            contextRoutes(socket);
            const response = new ResponseObject();
            callback(response.success(socket.session.id).getResponse());
        });

        socket.on(ROUTES.SESSION_CONTEXT_GET, (contextId, callback) => {
            debug(`${ROUTES.SESSION_CONTEXT_GET} event`);
            debug(`Context ID: ${contextId}`);
            socket.context = socket.session.getContext(contextId);
            // Rebind routes to new context
            contextRoutes(socket);
            const response =  new ResponseObject();
            callback(response.success(socket.context).getResponse());
        });

        socket.on(ROUTES.SESSION_CONTEXT_CREATE, (contextUrl, contextOptions, callback) => {
            debug(`${ROUTES.SESSION_CONTEXT_CREATE} event`);
            debug(`Context URL: ${contextUrl}, Options: ${JSON.stringify(contextOptions)}`);
            socket.context = socket.session.createContext(contextUrl, contextOptions);
            // Rebind routes to new context
            contextRoutes(socket);
            const response = new ResponseObject();
            callback(response.success(socket.context.id).getResponse());
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
};
