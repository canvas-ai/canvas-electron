const uWS = require('uWebSockets.js');

const PORT = 9001;

const app = uWS.App();

app.ws('/*', {
    /* Options */
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 10,
    /* Handlers */
    open: (ws, req) => {
        console.log('Client connected');
    },
    message: (ws, message, isBinary) => {
        console.log('Received message:', message.toString());
        app.publish('message', message);
    },
    close: (ws, code, message) => {
        console.log('Client disconnected');
    }
}).listen("ws://127.0.0.1:3000", (listenSocket) => {
    if (listenSocket) {
        console.log(`Listening on port ${PORT}`);
    }
});
