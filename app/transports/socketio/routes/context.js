// Utils
const debug = require('debug')('canvas-transport-socketio-route-context')
const ResponseObject = require('../../../utils/ResponseObject');


/**
 * Constants
 */

const ROUTES = require('../routes.js')


/**
 * Context routes
 * @param {*} socket
 * @param {*} context
 */

module.exports = function (socket, context) {


    /**
     * Setters
     */

    socket.on('context:set:url', (data) => {
        try {
            debug('Context:set:url event');
            context.url = data.url;
        } catch (err) {
            debug('Error setting context URL:', err);
        }
    });

    socket.on(ROUTES.CONTEXT_PATH_INSERT, (path, /* autocreateLayers, */ callback) => {
        try {
            debug(`context:insert:path event with path "${path}"`);
            const result = context.insertPath(path, true);

            // Check if the client expects a callback
            if (typeof callback === 'function') {
                // If so, use the callback to send a direct response to the client
                callback(new ResponseObject().success(result).getResponse());
            } else {
                // If not, emit an event with the result for any listening clients
                socket.emit(ROUTES.CONTEXT_PATH_INSERT, new ResponseObject().success(result).getResponse());
            }
        } catch (err) {
            debug('Error inserting path:', err);
            const errorResponse = new ResponseObject().error(`Error inserting path: ${err.message}`).getResponse();

            // Similarly, use callback if available, or emit an event if not
            if (typeof callback === 'function') {
                callback(errorResponse);
            } else {
                socket.emit(ROUTES.CONTEXT_PATH_INSERT, errorResponse);
            }
        }
    });


    socket.on('context:remove:path', (path) => {
        try {
            debug(`context:remove:path event with path "${path}"`);
            context.removePath(path);
        } catch (err) {
            debug('Error removing path:', err);
        }
    });

    socket.on('context:set:url', (data) => {
        try {
            debug('Context:set:url event');
            context.url = data.url;
        } catch (err) {
            debug('Error setting context URL:', err);
        }
    });

    socket.on('context:insert:path', (path) => {
        try {
            debug(`context:insert:path event with path "${path}"`);
            context.insertPath(path, true);
        } catch (err) {
            debug('Error inserting path:', err);
        }
    });

    socket.on('context:move:path', (pathFrom, pathTo, recursive) => {
        try {
            debug(`context:move:path event with parms "${pathFrom}" -> "${pathTo}", recursive: ${recursive}`);
            context.movePath(pathFrom, pathTo, recursive)
        } catch (err) {
            debug('Error removing path:', err);
        }
    });


    /**
     * Getters
     */

    socket.on('context:get:url', (callback) => {
        debug('Context:get:url event');
        const response = new ResponseObject();
        try {
            response.success(context.url);
        } catch (err) {
            response.error(`Failed to get context URL: ${err.message}`);
        }
        callback(response.getResponse());
    });

    socket.on('context:get:path', (callback) => {
        debug('Context:get:path event');
        const response = new ResponseObject();
        try {
            response.success(context.path);
        } catch (err) {
            response.error(`Failed to get context path: ${err.message}`);
        }
        callback(response.getResponse());
    });

    socket.on('context:get:tree', (callback) => {
        debug('Context:get:tree event');
        const response = new ResponseObject();
        try {
            response.success(context.tree);
        } catch (err) {
            response.error(`Failed to get context tree: ${err.message}`);
        }
        callback(response.getResponse());
    });

    socket.on('context:get:contextArray', (callback) => {
        debug('Context:get:contextArray event');
        const response = new ResponseObject();
        try {
            response.success(context.contextArray);
        } catch (err) {
            response.error(`Failed to get context array: ${err.message}`);
        }
        callback(response.getResponse());
    });

    socket.on('context:get:featureArray', (callback) => {
        debug('Context:get:featureArray event');
        const response = new ResponseObject();
        try {
            response.success(context.featureArray);
        } catch (err) {
            response.error(`Failed to get feature array: ${err.message}`);
        }
        callback(response.getResponse());
    });

    socket.on('context:get:filterArray', (callback) => {
        debug('Context:get:filterArray event');
        const response = new ResponseObject();
        try {
            response.success(context.filterArray);
        } catch (err) {
            response.error(`Failed to get filter array: ${err.message}`);
        }
        callback(response.getResponse());
    });

    
    /**
     * Document routes
     */

    socket.on('context:get:documents', async (data, callback) => {
        debug('context:get:documents event');
        const response = new ResponseObject();
        try {
            const documents = await context.listDocuments(data.type);
            response.success(documents);
        } catch (err) {
            response.error(`Failed to get documents: ${err.message}`);
        }

        if (callback) {
            debug('Executing documents:get callback function');
            callback(response.getResponse());
        } else {
            socket.emit('context:get:documents:response', response.getResponse());
        }
    });

    socket.on('context:insert:document', async (document, callback) => {
        debug('context:insert:document event');
        const response = new ResponseObject();
        try {
            const res = await context.insertDocument(document);
            response.success(res);
        } catch (err) {
            response.error(`Error inserting document: ${err.message}`);
        }
        if (callback) {
            debug('Executing insertDocument callback function');
            callback(response.getResponse());
        } else {
            socket.emit('context:insert:document:response', response.getResponse());
        }
    });

    socket.on('context:remove:document', async (id, callback) => {
        debug('context:remove:document event');
        const response = new ResponseObject();
        try {
            const res = await context.removeDocument(id);
            response.success(res);
        } catch (err) {
            response.error(`Error removing document: ${err.message}`);
        }
        if (callback) {
            debug('Executing removeDocument callback function');
            callback(response.getResponse());
        } else {
            socket.emit('context:remove:document:response', response.getResponse());
        }
    });

    socket.on('context:insert:documentArray', async (documentArray, callback) => {
        debug('context:insert:documentArray event');
        const response = new ResponseObject();
        try {
            const res = await context.insertDocumentArray(documentArray);
            response.success(res);
        } catch (err) {
            response.error(`Error inserting document array: ${err.message}`);
        }
        if (callback) {
            debug('Executing insertDocumentArray callback function');
            callback(response.getResponse());
        } else {
            socket.emit('context:insert:documentArray:response', response.getResponse());
        }
    });

    // ... remaining code ...


    /**
     * Event listeners
     */

    context.on('url', (url) => {
        debug('Emitting context:url change event')
        socket.emit('context:url', url);
    });

    context.on('context:documentInserted', (docMeta) => {
        debug('Emitting db:documentInserted event')
        socket.emit('context:documentInserted', docMeta);
    })


};


