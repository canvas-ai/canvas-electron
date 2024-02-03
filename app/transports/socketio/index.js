// Canvas service interface
const Service = require('../../managers/service/lib/Service');

// Utils
const debug = require('debug')('canvas-transport-socketio')
const ResponseObject = require('../../utils/ResponseObject');

// Includes
const http = require('http');
const io = require('socket.io')

// Routes
const contextRoutes = require('./routes/context');
const documentsRoutes = require('./routes/documents');

// Defaults
const DEFAULT_PROTOCOL = 'http'
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3001
const API_KEY = 'canvas-socketio';

// Middleware function to validate the API key
const validateApiKey = (req, res, next) => {
    const receivedApiKey = req.get('API-KEY');
    //if (receivedApiKey === API_KEY) {
        next();
    /*} else {
        console.log(`Unauthorized: Invalid API Key: ${receivedApiKey}`)
        res.status(401).send('Unauthorized: Invalid API Key');
    }*/
};

class SocketioTransport extends Service {

    #protocol;
    #host;
    #port;

    constructor(options = {}) {
        super(options);
        this.server = null;

        this.#protocol = options.protocol || DEFAULT_PROTOCOL;
        this.#host = options.host || DEFAULT_HOST;
        this.#port = options.port || DEFAULT_PORT;

        // TODO: Refactor!!!!! (this is a ugly workaround)
        if (!options.canvas) throw new Error('Canvas not defined');
        if (!options.context) throw new Error('Context not defined');
        this.canvas = options.canvas;
        this.context = options.context;

        debug(`Socket.io Transport initialized, protocol: ${this.#protocol}, host: ${this.#host}, port: ${this.#port}`)
    }

    async start() {
        const server = http.createServer();
        this.server = io(server);

        server.listen(this.#port, () => { // Listen on the specified port
            console.log("Socket.io Server listening on Port", this.#port);
            this.status = 'running';
        }).on('error', (err) => {
            console.error("Error in server setup:", err);
        });

        this.server.on('connection', (socket) => {
            debug(`Client connected: ${socket.id}`);

            // Setup routes && event handlers
            contextRoutes(socket, this.context);
            documentsRoutes(socket, this.canvas.documents);

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });
    }


    async stop() {
        if(this.server) {
            this.server.close();
            this.server = null;
        }
        this.status = 'stopped';
    }

    async restart(context, index) {
        await this.stop();
        await this.start(context, index);
    }

    status() {
        if (!this.server) { return { listening: false }; }

        let clientsCount = 0;
        for (const [id, socket] of this.server.sockets.sockets) {
            if (socket.connected) {
                clientsCount++;
            }
        }

        return {
            protocol: this.#protocol,
            host: this.#host,
            port: this.#port,
            listening: true,
            connectedClients: clientsCount
        };
    }

}

module.exports = SocketioTransport;
