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
const RESPONSE_OBJECT = {
    status: 'success',
    data: null,
    error: null
}

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


