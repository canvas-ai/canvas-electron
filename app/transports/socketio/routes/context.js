// Utils
const debug = require('debug')('canvas/transport/socketio/route/documents')
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

module.exports = function(socket, context) {


    /**
     * Getters
     */

    socket.on(ROUTES.CONTEXT_GET_ID, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_ID} event`);
        const response = new ResponseObject();
        callback(response.success(context.id).getResponse());
    });

    socket.on(ROUTES.CONTEXT_GET_URL, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_URL} event`);
        const response = new ResponseObject();
        callback(response.success(context.url).getResponse());
    });

    socket.on(ROUTES.CONTEXT_GET_TREE, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_TREE} event`);
        const response = new ResponseObject();
        callback(response.success(context.tree).getResponse());
    });

    socket.on(ROUTES.CONTEXT_GET_PATH, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_PATH} event`);
        const response = new ResponseObject();
        callback(response.success(context.path).getResponse());
    });    

    socket.on(ROUTES.CONTEXT_GET_BITMAPS, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_BITMAPS} event`);
        const response = new ResponseObject();
        callback(response.success(context.bitmaps).getResponse());
    });

    socket.on(ROUTES.CONTEXT_GET_CONTEXT_ARRAY, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_CONTEXT_ARRAY} event`);
        const response = new ResponseObject();
        callback(response.success(context.contextArray).getResponse());
    });

    socket.on(ROUTES.CONTEXT_GET_FEATURE_ARRAY, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_FEATURE_ARRAY} event`);
        const response = new ResponseObject();
        callback(response.success(context.featureArray).getResponse());
    });

    socket.on(ROUTES.CONTEXT_GET_FILTER_ARRAY, (callback) => {
        debug(`${ROUTES.CONTEXT_GET_FILTER_ARRAY} event`);
        const response = new ResponseObject();
        callback(response.success(context.filterArray).getResponse());
    });


    /** 
     * Setters
     */

    socket.on(ROUTES.CONTEXT_SET_URL, (url, /* autocreateLayers, */ callback) => {
        debug(`${ROUTES.CONTEXT_SET_URL} event with url "${url}"`);
        const response = new ResponseObject();

        try {            
            const result = context.setUrl(url, true);
            callback(response.success(result).getResponse());
        } catch (err) {
            callback(response.serverError(err).getResponse());
        }
    });

    socket.on(ROUTES.CONTEXT_PATH_INSERT, (path, /* autocreateLayers, */ callback) => {
        debug(`${ROUTES.CONTEXT_PATH_INSERT} event with path "${path}"`)
        const response = new ResponseObject();

        try {            
            const result = context.insertPath(path, true);
            // TODO: Implement additional return statuses
            callback(response.created(result).getResponse());
        } catch (err) {
            callback(response.serverError(err).getResponse());
        }
    });

    socket.on(ROUTES.CONTEXT_PATH_REMOVE, (path, recursive = false, callback) => {
        debug(`${ROUTES.CONTEXT_PATH_REMOVE} event with path "${path}", recursive "${recursive}"`)
        const response = new ResponseObject();

        try {            
            const result = context.removePath(path, recursive);
            callback(response.deleted(result).getResponse());
        } catch (err) {
            callback(response.serverError(err).getResponse());
        }
    });

    socket.on(ROUTES.CONTEXT_PATH_MOVE, (pathFrom, pathTo, recursive, callback) => {
        debug(`${ROUTES.CONTEXT_PATH_MOVE} event with pathFrom "${pathFrom}", pathTo "${pathTo}", recursive "${recursive}"`)
        const response = new ResponseObject();

        try {            
            const result = context.movePath(pathFrom, pathTo, recursive);
            callback(response.updated(result).getResponse());
        } catch (err) {
            callback(response.serverError(err).getResponse());
        }
    });


    /**
     * Context document routes
     */

    socket.on(ROUTES.CONTEXT_DOCUMENT_LIST, async (callback) => {
        debug(`${ROUTES.CONTEXT_DOCUMENT_LIST} event`);
        const response = new ResponseObject();
        try {
            const result = await context.listDocuments();
            callback(response.success(result).getResponse());
        } catch (err) {
            callback(response.error(err).getResponse());
        }
    });

    socket.on(ROUTES.CONTEXT_DOCUMENT_INSERT_ARRAY, async (data, callback) => {
        debug(`${ROUTES.CONTEXT_DOCUMENT_INSERT_ARRAY} event`);
        const response = new ResponseObject();
        // TODO: Input validation
        // TODO: Add featureArray, filterArray, use data.documentArray 
        // to be compliant with the REST API
        let documents = data;

        try {
            const result = await context.insertDocumentArray(documents);
            callback(response.success(result).getResponse());
        } catch (err) {
            callback(response.error(err).getResponse());
        }
    });    

    /**
     * Event listeners
     */

    context.on('url', (url) => {
        debug(`Emitting event ${ROUTES.EVENT_CONTEXT_URL}`)
        const response = new ResponseObject().success(url).getResponse();
        socket.emit(ROUTES.EVENT_CONTEXT_URL, response);
    });

};


