// Utils
const debug = require('debug')('canvas:transports:socketio:route:documents');


/**
 * Constants
 */

const ROUTES = require('../../routes.js');
const ResponseObject = require('../../../../../schemas/transport/responseObject.js');

/**
 * Documents routes
 * @param {*} socket
 * @param {*} db
 */

module.exports = function (socket, db) {

    socket.on(ROUTES.DOCUMENT_LIST, async (contextArray, featureArray, filterArray, callback) => {
        debug(`${ROUTES.DOCUMENT_LIST} event`);
        debug(`contextArray: ${contextArray}`);
        debug(`featureArray: ${featureArray}`);
        debug(`filterArray: ${filterArray}`);

        if (typeof callback === 'undefined') {
            throw new Error('No callback function provided.');
        }

        const response = new ResponseObject();
        try {
            const result = await db.listDocuments(contextArray, featureArray, filterArray);
            callback(response.success(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.error(err).getResponse());
        }
    });

    socket.on(ROUTES.DOCUMENT_GET, (id, callback) => {
        debug(`${ROUTES.DOCUMENT_GET} event with id "${id}"`);
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

    socket.on(ROUTES.DOCUMENT_GET_BY_HASH, (hash, callback) => {
        debug(`${ROUTES.DOCUMENT_GET_BY_HASH} event`);
        const response = new ResponseObject();
        try {
            const result = db.getDocumentByHash(hash);
            callback(response.success(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.error(err).getResponse());
        }
    });

    // TODO: Change to GET_MANY
    socket.on(ROUTES.DOCUMENT_GET_ARRAY, async (contextArray, featureArray, filterArray, callback) => {
        debug(`${ROUTES.DOCUMENT_GET_ARRAY} event`);
        debug(`contextArray: ${contextArray}`);
        debug(`featureArray: ${featureArray}`);
        debug(`filterArray: ${filterArray}`);

        if (typeof callback === 'undefined') {
            throw new Error('No callback function provided.');
        }

        const response = new ResponseObject();
        try {
            const result = await db.getDocuments(contextArray, featureArray, filterArray);
            callback(response.success(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.error(err).getResponse());
        }
    });

    socket.on(ROUTES.DOCUMENT_INSERT, async (data, contextArray, featureArray, callback) => {
        debug(`${ROUTES.DOCUMENT_INSERT} event`);
        debug(`contextArray: ${contextArray}`);
        debug(`featureArray: ${featureArray}`);

        if (typeof callback === 'undefined') {
            throw new Error('No callback function provided.');
        }

        const response = new ResponseObject();
        try {
            const result = await db.insertDocument(data, contextArray, featureArray);
            callback(response.success(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.error(err).getResponse());
        }
    });

    socket.on(ROUTES.DOCUMENT_INSERT_ARRAY, async (data, contextArray, featureArray, callback) => {
        debug(`${ROUTES.DOCUMENT_INSERT_ARRAY} event`);
        debug(`contextArray: ${contextArray}`);
        debug(`featureArray: ${featureArray}`);

        if (typeof callback === 'undefined') {
            throw new Error('No callback function provided.');
        }

        const response = new ResponseObject();
        let documents = data;

        try {
            const result = await db.insertDocumentArray(documents, contextArray, featureArray);
            callback(response.success(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.error(err).getResponse());
        }
    });

    socket.on(ROUTES.DOCUMENT_REMOVE, async (id, contextArray, callback) => {
        debug(`${ROUTES.DOCUMENT_REMOVE} event for document id "${id}""`);
        debug(`contextArray: ${contextArray}`);

        const response = new ResponseObject();

        if (typeof callback !== 'function') {
            throw new Error('No callback function provided.');
        }

        try {
            const result = await db.removeDocument(id, contextArray);
            callback(response.deleted(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.serverError(err).getResponse());
        }
    });

    socket.on(ROUTES.DOCUMENT_REMOVE_ARRAY, async (docArray, contextArray, callback) => {
        debug(`${ROUTES.DOCUMENT_REMOVE_ARRAY} event for document array "${docArray}""`);
        debug(`contextArray: ${contextArray}`);

        const response = new ResponseObject();

        if (typeof callback !== 'function') {
            throw new Error('No callback function provided.');
        }

        try {
            const result = await db.removeDocumentArray(docArray, contextArray);
            callback(response.deleted(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.serverError(err).getResponse());
        }
    });

    socket.on(ROUTES.DOCUMENT_DELETE, async (id, callback) => {
        debug(`${ROUTES.DOCUMENT_DELETE} event for document id "${id}""`);
        const response = new ResponseObject();

        try {
            const result = await db.deleteDocument(id);
            callback(response.deleted(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.serverError(err).getResponse());
        }
    });

    socket.on(ROUTES.DOCUMENT_DELETE_ARRAY, async (docArray, callback) => {
        debug(`${ROUTES.DOCUMENT_DELETE_ARRAY} event document array "${docArray}""`);
        const response = new ResponseObject();

        try {
            const result = await db.deleteDocumentArray(docArray);
            callback(response.deleted(result).getResponse());
        } catch (err) {
            console.error('Internal server error:', err);
            callback(response.serverError(err).getResponse());
        }
    });

};


