const uWS = require('uWebSockets.js');
const PORT = 9001;

const client = uWS.App();

client.ws('/*', {
    /* Options */
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 10,
    /* Handlers */
    open: (ws, req) => {
        console.log('Connected to server');
        ws.subscribe('message');
        ws.send('Hello, server!');
    },
    message: (ws, message, isBinary) => {
        console.log('Received message:', message.toString());
    },
    close: (ws, code, message) => {
        console.log('Disconnected from server');
    }
}).connect(PORT, (...args) => {
    console.log('Connected to server');
});



