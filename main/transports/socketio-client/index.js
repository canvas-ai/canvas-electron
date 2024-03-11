

const { io } = require("socket.io-client");
const socket = io.connect('http://127.0.0.1:8001');

socket.on('connect', () => {
    console.log('background.js | [socket.io] Browser Client connected to Canvas');
});

socket.on('connect_error', function (error) {
    console.log(`background.js | [socket.io] Browser Connection to "${config.transport.protocol}://${config.transport.host}:${config.transport.port}" failed`);
    console.error(error.message);
});

socket.on('connect_timeout', function () {
    console.log('background.js | [socket.io] Canvas Connection Timeout');
});

socket.on('disconnect', () => {
    console.log('background.js | [socket.io] Browser Client disconnected from Canvas');
});

socket.on('context:url', async (url) => {
    console.log('background.js | [socket.io] Received context URL update: ', url);
});
