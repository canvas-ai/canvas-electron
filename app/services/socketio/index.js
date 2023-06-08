'use strict'


/**
 * Simple socket.io server implementation
 */

// Load environment variables
const { app, user, transport } = require('../../env')

// Canvas service "interface"
const Service = require('../../models/Service');

// Utils
const debug = require('debug')('canvas-service-socketio')
const io = require('socket.io')

// Config
const config = require('../../../config/socketio-server.json')

// Constants, to be moved to config
const DEFAULT_PROTOCOL = config.protocol || 'http'
const DEFAULT_HOST = config.host || '127.0.0.1'
const DEFAULT_PORT = config.port || 3001
const API_KEY = config.key || 'canvas-socket.io';


class SocketIoService extends Service {

    constructor(options = {}) {
        super(options);

        this.server = null;

        this.context = options.context;
        this.index = options.index;

        this.options.protocol = options.protocol || DEFAULT_PROTOCOL;
        this.options.host = options.host || DEFAULT_HOST;
        this.options.port = options.port || DEFAULT_PORT;

    }

    async start() {
        // Create a socket.io server
        this.server = io();

        // Start listening on the specified port
        this.server.listen(this.options.port, (err) => {
            if (err) console.error("Error in server setup");
            console.log("Socket.io Server listening on Port", this.options.port);
        });

        // Setup event listeners
        this.server.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            setupSocketEventListeners(socket, this.context);
            setupContextEventListeners(socket, this.context);
            setupIndexEventListeners(socket, this.index);

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });

        this.status = 'running';
    }

    async stop() {
        if(this.server) {
            this.server.close();
            this.server = null;
        }
        this.status = 'stopped';
    }

    async restart(context, index) {
        await this.stop();
        await this.start(context, index);
    }

    status() {
        if (!this.server) { return { listening: false }; }

        let clientsCount = 0;
        for (const [id, socket] of this.server.sockets.sockets) {
            if (socket.connected) {
                clientsCount++;
            }
        }

        return {
            protocol: this.options.protocol,
            host: this.options.host,
            port: this.options.port,
            listening: true,
            connectedClients: clientsCount
        };
    }

}

module.exports = SocketIoService;


/**
 * Functions
 */

function setupSocketEventListeners(socket, context) {

    // Setters::Context
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


    // Getters::Context
    socket.on('context:get:stats', (data, callback) => {
        debug('Context:get:stats event')
        callback(context.stats());
    });

    socket.on('context:get:url', (data, callback) => {
        debug('Context:get:url event')
        callback(context.url);
    });

    socket.on('context:get:path', (data, callback) => {
        debug('Context:get:path event')
        callback(context.path);
    });

    socket.on('context:get:array', (data, callback) => {
        debug('Context:get:array event')
        callback(context.array);
    });

    socket.on('context:get:tree', (data, callback) => {
        debug('Context:get:tree event')
        callback(context.tree);
    });

    socket.on('context:get:contextArray', (data, callback) => {
        debug('Context:get:contextArray event')
        callback(context.contextArray);
    });

    socket.on('context:get:featureArray', (data, callback) => {
        debug('Context:get:featureArray event')
        callback(context.featureArray);
    });

    socket.on('context:get:filterArray', (data, callback) => {
        debug('Context:get:filterArray event')
        callback(context.filterArray);
    });

}

function setupIndexEventListeners(socket, index) {

    // Setters::Index
    socket.on('index:insertDocument', (doc, callback) => {
        debug('index:insertDocument event')
        try {
            index.insertDocument(doc);
            callback({ status: 'success', message: 'Document inserted successfully.' });
        } catch (error) {
            callback({ status: 'error', message: `Error inserting document: ${error.message}` });
        }
    })

    socket.on('index:updateDocument', (doc, callback) => {
        debug('index:updateDocument event')
        try {
            index.updateDocument(doc);
            callback({ status: 'success', message: 'Document updated successfully.' });
        } catch (error) {
            callback({ status: 'error', message: `Error updating document: ${error.message}` });
        }
    })

    socket.on('index:removeDocument', (doc, callback) => {
        debug('index:removeDocument event')
        try {
            index.removeDocument(doc);
            callback({ status: 'success', message: 'Document removed successfully.' });
        } catch (error) {
            callback({ status: 'error', message: `Error removed document: ${error.message}` });
        }
    })

    socket.on('index:schema:get', (data, callback) => {
        debug('index:schema:get event')

        try {
            const schema = index.getDocumentSchema(data.type, data.version);
            console.log(`schema: ${JSON.stringify(schema)}`)
            callback(schema)
        } catch (err) {
            callback({ status: 'error', message: error.message });
        }

    })


}

function setupContextEventListeners(socket, context) {

    context.on('url', (url) => {
        debug('context:url event')
        socket.emit('context:url', url);
    })

}
