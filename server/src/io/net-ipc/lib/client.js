'use strict';

/**
 * net.IPC Client
 */

// Utils
const net = require('net');
const os = require('os');
const EE = require('eventemitter2');

const {
    xpipe,
    msgPack,
    msgUnpack,
    genUUID,
} = require('./utils');

// Logger
const log = require('debug')('net.ipc.client');

// Constants
const DEFAULT_SOCKET_PATH = xpipe(os.tmpdir() + '/net.ipc.sock');
const CLIENT_ENABLE_RECONNECT = false;
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

class Client extends EE {

    constructor(opts = {}) {

        super();

        this.socketPath = (opts.socketPath) ? xpipe(opts.socketPath) : DEFAULT_SOCKET_PATH;
        this.autoreconnect = (opts.autoreconnect) ? opts.autoreconnect : CLIENT_ENABLE_RECONNECT;
        
        this.isQuitting = false;
        this.isConneted = false; // we have a valid socket connection
        this.isReady = false;    // we received an ACK message from server

        this.socket = null;
        this.socketID = null;
        this.errorCount = 0;

        this.queue = {};

    }

    // Status utils
    isQuitting() { return this.isQuitting; }
    isConnected() { return this.isConneted; }
    isReady() { return this.isReady; }

    getSocket() { return this.socket; }
    getSocketID() { return this.socketID; }
    getSocketPath() { return this.socketPath; }

    connect() {

        this.socket = net.connect(this.socketPath, () => {
            log(`IPC Client: Connecting to server via ${this.socketPath}`);
        })

        //.setTimeout(CLIENT_SOCKET_TIMEOUT_MS)
            .on('connect', () => { console.log(this.socket); this._handleConnection(); })
            .on('ready', () => { this.isConneted = true; })
            .on('data', (data) => this._handleData(data))
            .on('close', (e) => { log('IPC Client: close(hadError: ', e, ')'); this.emit('close'); })    // Test
            .on('error', (error) => this._handleError(error))
            .on('timeout', () => {
                log('IPC Client: socket timeout');
                this.socket.end();
                this.emit('timeout');
            });

        process.on('SIGINT', () => this.disconnect());
        //return this.socket
        return this;

    }

    disconnect() { 
        log('IPC Client: Server disconnect');
        this.socket.end(); 
        process.removeAllListeners();
        this.isConnected = false;
        this.socketID = null;
        this.socket.unref();
        this.emit('disconnect');
    }

    _reconnect() {
        this.disconnect();
        this.connect();
    }

    send(data = null, type = 'message') {

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
            
            if (!this.connect()) {
                log('IPC CLient: Reconnect failed');
                return false;
            }

        }

        let message = msgPack({
            id: (data.id) ? data.id : genUUID(),
            type: (data.type) ? data.type : type,
            payload: (data.payload) ? data.payload : data,
        });        

        log(`IPC Client: Sending data type "${data.type}" to server..`);
        return this.socket.write(message);

    }

    req(data, cb) {

        let requestID = genUUID();

        if (!this.send({
            id: requestID,
            type: 'req',
            payload: data,
        })) {return false;} 

        this.once(requestID, (reply) => {
            log(`IPC Client: Triggered reply event for ${requestID}`);
            if (typeof cb === 'function') {cb(reply);}
            return reply;
        });

        return true;
        
    }

    _handleConnection() {
        log('IPC Client: Socket connected');
        this.isConneted = true;
        this.emit('connect');
    }

    _handleData(data) {
        
        if (!data) {return null;}

        data = msgUnpack(data);
        log('IPC Client: Got data from server');

        if (!data.type || !data.payload) {
            log('IPC Client: Unknown data format, returning as raw data');
            this.emit('data', data);
            return data;
        }

        switch(data.type) {

            case 'req':
                log('IPC Client: > Received request message');
                this.emit('req', data, (reply) => {
                    log('IPC Client: Reply callback function');
                    let message = msgPack({
                        id: data.id,
                        type: 'rep',
                        payload: reply,
                    });

                    if (!this.socket.writable) {
                        log('IPC Client: Socket not writable');
                    } else {
                        log('IPC Client: Socket write:', this.socket.write(message));
                        //log('IPC Client: Implicit disconnect on reply ')
                        //this.socket.end()
                    }                    
                });
                break;

            case 'rep':
                log(`IPC Client: Data is a reply message with ID ${data.id}, emitting reply event`);
                this.emit(data.id, data.payload);
                break;

            case 'broadcast':
                log('IPC Client: > Data is a broadcast message');
                this.emit('broadcast', data.payload);
                break;                
    
            case '__connect':
                log('IPC Client: Received connection ACK from server');
                this.emit('ready', data);
                break;

            case '__disconnect':
                log('IPC Client: Receive a disconnect command from server');
                return this.disconnect();

            default:
                log(`IPC Client: > Data has a custom data type: ${data.type}`);
                this.emit(data.type, data.payload);
        }

        // return true // data.payload

    }

    _handleError(e) {

        this.emit('error', e);        
        if (e.code === 'ENOENT' && this.autoreconnect) {
            log(`IPC CLient: Attempting to reconnect, timeout ${CLIENT_RECONNECT_TIMEOUT_MS}ms`);
            setTimeout(() => { 
                this._reconnect(); 
                // Resend queue
            }, CLIENT_RECONNECT_TIMEOUT_MS);
        }

        log(e);        

    }

}

module.exports = Client;