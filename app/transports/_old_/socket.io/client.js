'use strict'


const { io } = require("socket.io-client");
// Temporary
let serverToken = 'canvas.api-gE$s3E&R&w4Rne;3NUwE=Wa9Ak'


class Client {

    constructor(url, options) {

        if (!url) throw new Error('No connection url specified')

        options = {
            reconnection: false,
            reconnectionDelay: 500,
            reconnectionAttempts: 1,
            query: {
              token: 'canvas.api-gE$s3E&R&w4Rne;3NUwE=Wa9Ak'
            },
            ...options
        }

        this.socket = null
        this.isConnected = false;

    }

    connect() {

        this.socket = io.connect('http://localhost:3000');

        this.socket.on('connect', () => {
            console.log("Connected to server")
            this.isConnected = true;
        })

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log("Disconnected from server");
        });

    }

    disconnect() { this.socket.disconnect(); }

    isConnected() { return this.isConnected; }

    addListener(event, callback) {
        this.socket.on(event, callback);
    }

    sendMessage(message, channel = 'message') {
        this.socket.emit(channel, message);
    }
}


module.exports = Client
