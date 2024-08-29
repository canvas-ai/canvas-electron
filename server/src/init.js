/**
 * Canvas server initialization script
 */

// Environment variables
const {
    app,
    server,
    user,
} = require('./env.js');

/*
 * ! The current script - as of now - is not really needed, but the aim is to keep the main
 * script as clean as possible. This script will be responsible for initializing the server
 * and the user environment based on CLI/env args and starting the server. Maybe we can merge
 * it with the env script in the future (?)
 */

// Server mode (names subject to change)
// full: server is running with a user environment
// minimal: server is only running the roleManager module and default transports
let serverMode = 'full';
const argv = require('minimist')(process.argv.slice(2));
if (argv.standalone) {
    serverMode = 'minimal';
    console.log('Minimal mode enabled, user environment won\'t be initialized');
} else {
    console.log('Full mode enabled, user environment will be initialized');
}

// Canvas
const Canvas = require('./main');
const canvas = new Canvas({
    mode: serverMode,
    app: app,
    paths: {
        server: server.paths,
        user: user.paths,
    },
});

// Start the server
canvas.start();

// Event handlers
canvas.on('running', () => {
    console.log('Canvas server started successfully.');
});

canvas.on('error', (err) => {
    console.error('Canvas server failed to start.');
    console.error(err);
});

