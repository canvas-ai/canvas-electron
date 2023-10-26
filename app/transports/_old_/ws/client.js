const WebSocket = require('ws');
const PORT = 9001;

const ws = new WebSocket(`ws://localhost:${PORT}`);

ws.on('open', () => {
    console.log('Connected to server');
    ws.send('hello world', (...args) => {
        console.log(args)
    })
    ws.terminate()

});

ws.on('message', (message) => {
    console.log('Received message:', message.toString());
});

ws.on('close', () => {
    console.log('Disconnected from server');
});


