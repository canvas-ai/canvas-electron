// Utils
const debug = require('debug')('canvas/transport/socketio/route/documents')
const ResponseObject = require('../../../utils/ResponseObject');


/**
 * Constants
 */

const ROUTES = require('../routes.js')


/**
 * Documents routes
 * @param {*} socket
 * @param {*} db
 */

module.exports = function (socket, db) {

    socket.on(ROUTES.CONTEXT_DOCUMENT_GET, (id, callback) => {
        debug(`${ROUTES.CONTEXT_DOCUMENT_GET} event with id "${id}"`);
        const response = new ResponseObject();

        try {
            const result = db.getDocumentById(id);
            debug('Document:', result);
            callback(response.success(result).getResponse());
        } catch (err) {
            debug('Error getting document:', err);
            const errorResponse = response.serverError(`Error getting document: ${err.message}`).getResponse();
            callback(errorResponse);
        }
    });

};


