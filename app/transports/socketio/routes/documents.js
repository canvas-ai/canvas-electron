// Utils
const debug = require('debug')('canvas-transport-socketio-route-documents')

/**
 * Constants
 */

const DOCUMENTS_GET = 'documents:get'; // Return all documents of the current context
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

    socket.on('documents:get', async (data, callback) => {
        debug('documents:get event')
        debug(data)

        const documents = await context.listDocuments(data.type);
        RESPONSE_OBJECT.data = documents

        if (callback) {
            debug('Executing documents:get callback function')
            callback(RESPONSE_OBJECT)
        } else {
            socket.emit('documents:get:response', RESPONSE_OBJECT)
        }

    });

    // TODO: Add featureArray and filterArray support
    socket.on('documents:insertDocumentArray', async (documentArray, callback) => {
        debug('documents:insertDocumentArray event')
        debug(documentArray)

        try {
            const res = await context.insertDocumentArray(documentArray);
            RESPONSE_OBJECT.data = res
            if (callback) {
                debug('Executing insertDocumentArray callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('documents:insertArray:response', RESPONSE_OBJECT)
            }
        } catch (err) {
            debug('Error inserting document array', err)
            RESPONSE_OBJECT.error = err
            RESPONSE_OBJECT.status = 'error'
            if (callback) {
                debug('Executing insertDocumentArray callback function')
                callback(RESPONSE_OBJECT)
            } else {
                socket.emit('documents:insertArray:response', RESPONSE_OBJECT)
            }
        }

    });

};


