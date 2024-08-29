'use strict';

/**
 * net.IPC Server
 */

// Utils
const net = require('net');
const os = require('os');
const fs = require('fs');
const EE = require('eventemitter2');

const {
    xpipe,
    msgPack,
    msgUnpack,
    genUUID,
} = require('./utils');

// Logger
const log = require('debug')('net.ipc.server');

// Constants
const DEFAULT_SOCKET_PATH = xpipe(os.tmpdir() + '/net.ipc.sock');
const SERVER_SOCKET_TIMEOUT_MS = 1000;
const SERVER_IGNORE_EVENTS = [];

class Server extends EE {

    constructor(opts = {}) {

        super();

        this.socketPath = (opts.socketPath) ? xpipe(opts.socketPath) : DEFAULT_SOCKET_PATH;
        this.isQuitting = false;
        this.sockets = {};
        this.connectionCount = 0;
        this.listener = null;

        // TODO: Check if active > refuse to remove
        if (fs.existsSync(this.socketPath)) {this._unlinkSocket();}

    }

    getClients() { return Object.keys(this.sockets); }
    getConnectionCount() { return this.connectionCount; }

    start() {

        this.listener = net.createServer((socket) => {
            socket.on('data', (data) => this._handleData(data, socket));
        })

            .listen(this.socketPath)
            .on('connection', (socket) => this._handleConnection(socket))
            .on('error', (error) => this._handleError(error));

        log(`IPC Server::Listening on ${this.socketPath} with PID:${process.pid}`);
        process.on('SIGINT', () => this.stop());

        return this;

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

        this.emit('stop');
    }

    send(data, socket = null) {

        if (!socket) {return this.broadcast(data);}

        let message = msgPack({
            id: (data.id) ? data.id : genUUID(),
            type: (data.type) ? data.type : 'data',
            payload: (data.payload) ? data.payload : data,
        });

        if (typeof socket === 'object') // got a socket
        {return (socket.writable) ? socket.write(message) : false;}

        if (typeof socket === 'number') // got a socket ID
        {return (this.sockets[socket].writable) ? this.sockets[socket].write(message) : false;}

        return false;

    }

    broadcast(data) {

        let message = msgPack({
            id: genUUID(),
            type: 'broadcast',
            payload: (data.payload) ? data.payload : data,
        });

        var clients = Object.keys(this.sockets);
        if (clients.length === 0) { log('IPC Server: No clients connected'); return false; }

        while (clients.length) {
            let client = clients.pop();
            log(`IPC Server: Sending broadcast message to ${client}`);
            this.sockets[client].write(message);
        }

    }

    _handleConnection(socket) {

        var sockID = genUUID();

        this.sockets[sockID] = socket;
        this.connectionCount++;

        log(`IPC Server: Client #${this.connectionCount} ID ${sockID} connected`);
        this.emit('connect', sockID);

        socket.write(msgPack({ type: '__connect', payload: sockID }));

        socket.on('error', (e) => {
            if (
                e.code === 'ERR_STREAM_DESTROYED' ||
                e.code === 'EPIPE'
            ) {
                log('Epipe error');
                //delete this.sockets[sockID]
                //this.connectionCount--
            }

            log(`IPC Server Error > Code: ${e.code}` );
        });

        socket.on('end', () => {
            this.connectionCount--;
            delete this.sockets[sockID];
            log(`IPC Server: Client ${sockID} disconnected`);
            this.emit('disconnect', sockID);
        });
    }

    _handleData(data, socket) {

        data = msgUnpack(data);
        log('IPC Server: Received data from client');

        if (!data.id || !data.type || !data.payload) {
            log('IPC Server: Unknown data format, returning as raw data');
            this.emit('data', data);
            return true; //data
        }

        switch(data.type) {

            case 'req':
                log('IPC Server: Got request -> will reply');
                this.emit('req', data, (reply) => {
                    log('IPC Server: Reply callback function');
                    let message = msgPack({
                        id: data.id,
                        type: 'rep',
                        payload: reply,
                    });

                    if (!socket.writable) {
                        log('IPC Server: Socket not writable');
                    } else {
                        log('IPC Server: Socket write:', socket.write(message));
                        log('IPC Server: Implicit disconnect on reply ');
                        socket.end();
                    }
                });
                break;

            case 'rep':
                log('IPC Server: Received reply message');
                this.emit(data.id, data.payload);
                break;

            case 'broadcast':
                log('IPC Server: Received broadcast message');
                this.emit('broadcast', data.payload);
                break;

            default:
                log(`IPC Server: Received custom data type: ${data.type}`);
                this.emit(data.type, data.payload);
        }

        // return true // data.payload

    }

    _handleError(e) {

        this.emit('error', e);
        log('IPC Server: Error ' + e.code);

        switch(e.code) {
            case 'EADDRINUSE':
                this._unlinkSocket();
                this.start();
                break;
            case 'EPIPE':
                log('IPC Server: EPIPE Event ignored');
                break;
            default:
                console.error('IPC Server: Communication error occurred: ', e);
        }

    }

    _unlinkSocket() {
        try { fs.unlinkSync(this.socketPath); }
        catch(err) { if (err) {throw err;} }
    }

}

module.exports = Server;
