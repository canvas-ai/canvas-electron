
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
    socket.on('context:set:url', (data) => { /* ... */ });
    socket.on('context:get:path', (data, callback) => { /* ... */ });
};


