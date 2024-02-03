// Utils
const debug = require('debug')('canvas-transport-socketio-route-context')

/**
 * Constants
 */

const CONTEXT_GET_URL = 'context:get:url';
const CONTEXT_SET_URL = 'context:set:url';
const CONTEXT_GET_PATH = 'context:get:path';
const CONTEXT_INSERT_PATH = 'context:insert:path';
const CONTEXT_REMOVE_PATH = 'context:remove:path';

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
        debug('Context:set:url event')
        context.url = data.url;
    });

    socket.on('context:insert:path', (path) => {
        debug(`context:insert:path event with path "${path}"`)
        context.insertPath(path, true)
    })

    socket.on('context:remove:path', (path) => {
        debug(`context:remove:path event with path "${path}"`)
        context.removePath(path)
    })

    socket.on('context:move:path', (pathFrom, pathTo, recursive) => {
        debug(`context:move:path event with parms "${pathFrom}" -> "${pathTo}", recursive: ${recursive}`)
        context.movePath(pathFrom, pathTo, recursive)
    })


    /**
     * Getters
     */

    socket.on('context:get:stats', (callback) => {
        debug('Context:get:stats event')
        callback(context.stats());
    });

    socket.on('context:get:url', (callback) => {
        debug('Context:get:url event')
        RESPONSE_OBJECT.data = context.url;
        callback(RESPONSE_OBJECT);
    });

    socket.on('context:get:path', (callback) => {
        debug('Context:get:path event')
        RESPONSE_OBJECT.data = context.path;
        callback(RESPONSE_OBJECT);
    });

    socket.on('context:get:tree', (callback) => {
        debug('Context:get:tree event')
        RESPONSE_OBJECT.data = context.tree;
        callback(RESPONSE_OBJECT);
    });

    socket.on('context:get:contextArray', (callback) => {
        debug('Context:get:contextArray event')
        RESPONSE_OBJECT.data = context.contextArray;
        callback(RESPONSE_OBJECT);
    });

    socket.on('context:get:featureArray', (callback) => {
        debug('Context:get:featureArray event')
        RESPONSE_OBJECT.data = context.featureArray;
        callback(RESPONSE_OBJECT);
    });

    socket.on('context:get:filterArray', (callback) => {
        debug('Context:get:filterArray event')
        RESPONSE_OBJECT.data = context.filterArray;
        callback(RESPONSE_OBJECT);
    });


    /**
     * Document routes
     */

    socket.on('context:get:documents', async (data, callback) => {
        debug('context:get:documents event')
        debug(data)

        const documents = await context.listDocuments(data.type);
        RESPONSE_OBJECT.data = documents

        if (callback) {
            debug('Executing documents:get callback function')
            callback(RESPONSE_OBJECT)
        } else {
            socket.emit('context:get:documents:response', RESPONSE_OBJECT)
        }

    });

    socket.on('context:insert:document', async (document, callback) => {
        debug('context:insert:document event')
        debug(document)

        try {
            const res = await context.insertDocument(document);
            RESPONSE_OBJECT.data = res
            if (callback) {
                debug('Executing insertDocumentArray callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('context:insert:document:response', RESPONSE_OBJECT)
            }
        } catch (err) {
            debug('Error inserting document', err)
            RESPONSE_OBJECT.error = err
            RESPONSE_OBJECT.status = 'error'
            if (callback) {
                debug('Executing insertDocument callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('context:insert:document:response', RESPONSE_OBJECT)
            }
        }

    });

    socket.on('context:remove:document', async (id, callback) => {
        debug('context:remove:document event')
        debug(id)

        try {
            const res = await context.removeDocument(id);
            RESPONSE_OBJECT.data = res
            if (callback) {
                debug('Executing removeDocument callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('context:remove:document:response', RESPONSE_OBJECT)
            }
        } catch (err) {
            debug('Error removing document', err)
            RESPONSE_OBJECT.error = err
            RESPONSE_OBJECT.status = 'error'
            if (callback) {
                debug('Executing removeDocument callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('context:remove:document:response', RESPONSE_OBJECT)
            }
        }

    });

    socket.on('context:insert:documentArray', async (documentArray, callback) => {
        debug('context:insert:documentArray event')
        debug(documentArray)

        try {
            const res = await context.insertDocumentArray(documentArray);
            RESPONSE_OBJECT.data = res
            if (callback) {
                debug('Executing insertDocumentArray callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('context:insert:documentArray:response', RESPONSE_OBJECT)
            }
        } catch (err) {
            debug('Error inserting document array', err)
            RESPONSE_OBJECT.error = err
            RESPONSE_OBJECT.status = 'error'
            if (callback) {
                debug('Executing insertDocumentArray callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('context:insert:documentArray:response', RESPONSE_OBJECT)
            }
        }

    });

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


