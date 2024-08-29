'use strict';


// Utils
const net = require('net');
const os = require('os');
const fs = require('fs');
const Packer = require('amp-message');
const EE = require('eventemitter2');

// Logger
const log = console.log;

// Constants
const SOCKET_PATH = os.tmpdir() + '/ws-ipcd.sock';
const DEFAULT_SOCKET_PATH = SOCKET_PATH;
const CLIENT_SOCKET_TIMEOUT_MS = 1000;
const CLIENT_RECONNECT_TIMEOUT_MS = 2000;
const CLIENT_RECONNECT_ERROR_COUNT = 3;   // Number of connection errors till we attempt a reconnect
const CLIENT_IGNORE_EVENTS = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENETDOWN',
    'EPIPE',
    'ENOENT',
];

const SCHEMA_V0 = {};

class Server extends EE {

    constructor(socketPath) {

        super();

        this.socketPath = (socketPath) ? xpipe(socketPath) : SOCKET_PATH;
        this.isQuitting = false;
        this.sockets = {};
        this.connectionCount = 0;
        this.listener = null;

        if (fs.existsSync(this.socketPath)) {this._unlinkSocket();}

    }

    start() {

        this.listener = net.createServer((socket) => {
            socket.on('data', (data) => this._handleData(data, socket));
        })

            .listen(this.socketPath)
            .on('connection', (socket) => this._handleConnection(socket))
            .on('error', (error) => this._handleError(error));

        log(`IPC Server::Listening on ${this.socketPath} with PID:${process.pid}`);
        process.on('SIGINT', () => this.stop());

        return this.listener;

    }

    send(data, socket) {

        if (!socket) {return this.broadcast(data);}

        let message = {
            id: genUUID(),
            type: '',
            payload: '',
        };

        if (typeof socket === 'object')
        {return (socket.writable) ? socket.write(msgPack(data)) : false;}

        if (typeof socket === 'number')
        {return (this.sockets[socket].writable) ? this.sockets[socket].write(msgPack(data)) : false;}

        return false;

    }

    broadcast(data) {

        let message = {
            id: genUUID(),
            type: 'broadcast',
            payload: data,
        };

        message = msgPack(message);

        if (Object.keys(this.sockets).length) {

            log(`IPC Server: Sending broadcast message to ${Object.keys(this.sockets).length} clients`);
            let clients = Object.keys(this.sockets);

            while(clients.length){
                let client = clients.pop();
                this.sockets[client].write(message);
            }
        }

    }

    stop() {

        if(!this.isQuitting) {
            this.isQuitting = true;
            log(`IPC server::Terminating, PID ${process.pid}`);

            if (Object.keys(this.sockets).length) {
                let clients = Object.keys(this.sockets);
                while(clients.length){
                    let client = clients.pop();
                    this.sockets[client].write(msgPack({type: '__disconnect'}));
                    this.sockets[client].end();
                }
            }

            if (this.listener) {this.listener.close();}
        }
    }

    _handleConnection(socket) {
        var socketID = Date.now(); // TODO: Change to uuid
        socket.id = socketID;

        this.sockets[socketID] = socket;
        this.connectionCount++;

        log(`IPC Server: Client #${this.connectionCount} ID ${socketID} connected`);

        socket.on('error', (e) => {
            if (
                e.code === 'ERR_STREAM_DESTROYED' ||
                e.code === 'EPIPE'
            ) {
                delete this.sockets[socketID];
                this.connectionCount--;
            }
            log('IPC Server Error');
            log(e.code);
        });

        socket.on('end', () => {
            log(`IPC Server: Client ${socketID} disconnected`);
            this.connectionCount--;
            delete this.sockets[socketID];
        });
    }

    _handleData(data, socket) {

        data = msgUnpack(data);
        data.socketID = socket.id;

        log('IPC Server: Received data from client');
        log('---- Server data ----');
        log(data);
        log('---- /Server data ----');
        if (!data.id || !data.type || !data.payload) {
            log('IPC Server: Unknown data format, returning as raw data');
            this.emit('data', data);
            return data;
        }

        switch(data.type) {

            case 'req':
                log('Got request -> will reply');
                this.emit('req', data);
                break;

            case 'rep':
                //this.emit('rep', data)
                this.emit(`${data.id}`, 'testpayload');
                break;

            case 'broadcast':
                this.emit('broadcast', data);
                break;

            default:
                log(`Got ${data.type} => Default action`);
                this.emit('data', data.payload);
        }

        return;
        //socket.write(msgPack(reply))

    }

    _handleError(e) {

        switch(e.code) {
            case 'EADDRINUSE':
                this._unlinkSocket();
                this.start();
                break;
            case 'EPIPE':
                log('EPIPE Event ignored');
                break;
            default:
                console.error('IPC Server::Communication error occurred: ', e);

        }

    }

    _unlinkSocket() {
        try { fs.unlinkSync(this.socketPath); }
        catch(err) { if (err) {throw err;} }
    }

}

class Client extends EE {

    constructor(socketPath) {

        super();

        this.socketPath = (socketPath) ? xpipe(socketPath) : DEFAULT_SOCKET_PATH;
        this.isQuitting = false;
        this.isConneted = false;
        this.socket = null;
        this.errorCount = 0;
        this.cbQueue = [];

    }

    // Status utils
    isQuitting() { return this.isQuitting; }
    isConnected() { return this.isConneted; }
    getSocket() { return this.socket; }
    //get socket() { return this._socket }

    connect() {

        // Connect to server
        console.log(`IPC Client: Connecting to server via ${this.socketPath}`);
        this.socket = net.connect(this.socketPath, () => {
            log('IPC Client: Connected to server');
            this.isConneted = true;
        })

        //.setTimeout(CLIENT_SOCKET_TIMEOUT_MS)
            .on('connect', () => this._handleConnection())
            .on('data', (data) => this._handleData(data))
        //.on('close', (e) => { log('close', e) })    // Test
            .on('error', (error) => this._handleError(error));
        /*.on('timeout', () => {
            log('socket timeout')
            this.socket.end()
        })*/

        process.on('SIGINT', () => this.disconnect());
        return this.socket;

    }

    disconnect() {
        log('IPC Client: Server disconnect');
        this.isConnected = false;
        this.socket.end();
        process.removeAllListeners();
        this.socket.unref();
    }

    _reconnect() {
        this.disconnect();
        this.connect();
    }

    send(data, type = 'message') {

        if (!data) {
            log('IPC Client: No data to be send');
            return false;
        }

        if (!this.socket) {
            log('IPC Client: Socket not connected, attempting to connect');
            if (!this.connect()) {return false;}
        }

        if (!this.socket.writable) {
            log('IPC Client: Socket not writable');
            this.errorCount++;
            if (this.errorCount > CLIENT_RECONNECT_ERROR_COUNT) {
                log('IPC Client: Connection error threshold reached, attempting a full reconnect');
                this.disconnect();
            }

            if (!this.connect()) {return false;}

        }

        log('IPC Client: Sending data to server');
        data = msgPack(data);
        return this.socket.write(data);
    }

    req(data, cb) {

        let requestID = genUUID();

        if (!this.send({
            id: requestID,
            type: 'req',
            payload: data,
        })) {return false;}

        this.once(requestID, (reply) => {
            log(`IPC Client: Got reply for ${requestID}`);
            if (typeof cb === 'function') {cb(reply);}
            return reply;
        });

        return true;

    }

    _handleConnection() {
        log('Client connected');
    }

    _handleData(data) {

        data = msgUnpack(data);
        log('IPC Client: Received data');

        if (!data.id || !data.type || !data.payload) {
            log('IPC Client: Unknown data format, returning as raw data');
            this.emit('data', data);
            return data;
        }

        switch(data.type) {

            case 'req':
                log('req');
                this.emit(`${data.id}`, data.payload);
                break;

            case 'rep':
                log('rep');
                log(data.payload);
                this.emit(`${data.id}`, data.payload);
                break;

            case 'broadcast':
                this.emit('broadcast', data);
                break;

            case '__disconnect':
                this.emit('disconnect');
                return this.disconnect();

            default:
                log('def');
                this.emit('data', data.payload);
        }

        return data.payload;

    }

    _handleError(e) {

        log('------- Client Error -------');
        if (e.code === 'ENOENT') {
            log(`Attempting to reconnect, timeout ${CLIENT_RECONNECT_TIMEOUT_MS}`);
            setTimeout(() => {
                //this.connect()
                this._reconnect();
            }, CLIENT_RECONNECT_TIMEOUT_MS);
        }

        log(e);
        log('------- /Client Error -------');

    }

}

module.exports = {
    Client: Client,
    Server: Server,
};

/**
 * Credits:
 * https://github.com/nodexo/xpipe/blob/master/index.js
 * @param {*} path
 * @returns
 */
function xpipe(path) {

    let prefix = process.platform === 'win32' ? '//./pipe/' : '';
    if (prefix.endsWith('/') && path.startsWith('/')) {
        return prefix + path.substr(1);
    }

    return prefix + path;

}

function msgPack(msg) {
    let packer = new Packer;
    packer.push(msg);
    return packer.toBuffer();
}

function msgUnpack(msg) {
    return new Packer(msg).args[0]; // Implementation specific, lets not waste time on this
}

function genUUID() {
    // Replace with UUID
    return Date.now();
}
