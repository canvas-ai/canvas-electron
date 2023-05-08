'use strict'


/**
 * Simple socket.io server implementation
 */

// Load environment variables
const {
    app,
    user,
    transport,
} = require('../../env')


// Utils
const debug = require('debug')('canvas-service-socketio')
const io = require('socket.io')

// Constants
const PORT=8001

let server = null

exports.start = (context) => {

    server = io()

    server.listen(PORT, (err) => {
        if (err) console.log("Error in server setup")
        console.log("Canvas Socket.IO Server listening on Port", PORT);
    })

    server.on('connection', (socket) => {

        debug(`Client connected: ${socket.id}`);

        //setupContextGetListeners() {}
        //setupContextSetListeners() {}
        setupContextEventListeners(socket, context)

        //setupIndexGetListeners() {}
        //setupIndexSetListeners() {}

        socket.on('disconnect', () => {
            debug(`Client disconnected: ${socket.id}`);
        });


    })

}

exports.stop = () => {
    server.close()
}

exports.restart = () => {
    return true
}

exports.status = () => {
    return true
}


/**
 * Functions
 */

const Document = require('../../engine/index/schemas/Document')

function genDocument(data) {

    let doc = new Document({
        type: 'data/abstr/tab',
        data: data.url,
        meta: data
    })

    debug(doc)
    return doc

}


function setupContextEventListeners(socket, context) {

    socket.on('context:get', (query, callback) => {

        debug('Request received:', query);
        let response = null

        switch (query) {

            case 'url':
                response = context.url
                break;

            case 'tree':
                response = context.tree
                console.log('context.tree')
                console.log(context.tree)
                break;

            default:
                debug(`Unsupported query "${query}"`)

        }

        // Call the callback if it's a valid function
        if (typeof callback === 'function') {
            callback(response);
        } else {
            socket.emit('response', response);
        }

    });

    socket.on('context:set', (url) => {
        console.log(`Context set event with url ${url}`)
        context.set(url, true)
    })

    socket.on('context:insert', (path) => {
        console.log(`Context inser event with path "${path}"`)
        console.log('-------------------')
        console.log(path)
        console.log('-------------------')
        context.insertPath(path, true)
    })

    socket.on('context:tree', (tree) => {
        console.log(`Context tree update event`)
        context.updateTreeFromJson(tree)
    })

    context.on('url', (url) => {
        console.log('context:url event')
        server.emit('context:url', url);
    })

    /*
    socket.onAny((event, ...args) => {
        console.log(`got ${event}`);
    });

    socket.on('context:*', (eventName, ...args) => {
        console.log('Context event')
        const [prefix, methodName] = eventName.split(':');
        if (prefix === 'context' && methodName) {
          //const result = context[methodName](...args);
          callback(result);
        }
    });

    /*
    socket.on('context', async (query, callback) => {

    })

    socket.on('data', async (query, callback) => {

    })
    */
}
