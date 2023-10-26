'use strict';



const io = require('socket.io')
// Temporary
let serverToken = 'canvas.api-gE$s3E&R&w4Rne;3NUwE=Wa9Ak'


class Server extends io.Server {

    constructor(port, options) {

        if (!port) throw new Error('No listening PORT specified')

        options = {
            // TODO
            ...options
        }

        super()

        this.port = port

    }

    start() {
        this.listen(this.port);
        console.log("Server started on port " + this.port);
        this.setupListeners()
    }

    sendMessage(message, socketID) {
        this.to(socketID).emit('message', message);
    }

    broadcastMessage(message) {
        this.emit('message', message);
    }

    stop() {
        this.close();
        console.log("Server stopped");
    }

    addListener(event, callback) {
        this.on(event, callback);
    }

    removeListener(event) {
        this.removeAllListeners(event);
    }

    setupListeners() {
        this.on('connection', (socket) => this.#handleConnection(socket))
    }

    subscribeToChannel(channel, socket) {
        socket.join(channel);
    }

    unsubscribeFromChannel(channel, socket) {
        socket.leave(channel);
    }

    #handleConnection(socket) {

        console.log(`Socket ${socket.id} connected`);
        this.broadcastMessage("New user connected");

        socket.on('message', (message) => {
            console.log(`Received message from ${socket.id}: ${message}`);
            this.broadcastMessage(`${socket.id}: ${message}`);
        });

        socket.on('subscribe', (channel) => {
            console.log(`Socket ${socket.id} subscribed to ${channel}`);
            this.subscribeToChannel(channel, socket);
        });

        socket.on('unsubscribe', (channel) => {
            console.log(`Socket ${socket.id} unsubscribed from ${channel}`);
            this.unsubscribeFromChannel(channel, socket);
        });

        socket.on('disconnect', () => {
            console.log(`Socket ${socket.id} disconnected`);
            this.broadcastMessage(`User disconnected`);
        });
    }


}

/*
You can also use io.of('/').clients((error, clients) => {}) to get an array of all connected clients.

You can use io.sockets.clients() to get an array of all connected clients, it works the same as io.of('/').clients

You can also use io.sockets.adapter.clients() to get an object that contains all connected clients' ids, indexed by room names.

You can also use io.sockets.adapter.rooms to check which sockets are in a specific room.

const srv = new Server(2000)
srv.start()
console.log(Object.keys(srv.sockets.sockets));



const io = require('socket.io');
const server = io();

const database = server.of('/database');
const context = server.of('/context');
const device = server.of('/device');
const user = server.of('/user');

database.on('connection', (socket) => {
    socket.on('query', (data) => {
        console.log(`Received query from ${socket.id}: ${data}`);
        // handle query
    });
});

context.on('connection', (socket) => {
    socket.on('update', (data) => {
        console.log(`Received update from ${socket.id}: ${data}`);
        // handle update
    });
});

device.on('connection', (socket) => {
    socket.on('status', (data) => {
        console.log(`Received status from ${socket.id}: ${data}`);
        // handle status
    });
});

user.on('connection', (socket) => {
    socket.on('login', (data) => {
        console.log(`Received login from ${socket.id}: ${data}`);
        // handle login
    });
});


// Client side
const socket = io.connect('http://localhost:9001/database');
socket.emit('query', { query: 'SELECT * FROM users' });

const socket = io.connect('http://localhost:9001/context');
socket.emit('update', { context: 'new_context' });

const socket = io.connect('http://localhost:9001/device');
socket.emit('status', { device: 'device_id' });

const socket = io.connect('http://localhost:9001/user');
socket.emit('login', { user: 'username', pass: 'password' });



*/

module.exports = Server
