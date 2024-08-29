// Canvas service interface
const Service = require('../../managers/service/lib/Service');

// Utils
const debug = require('debug')('canvas:transports:http');
const bodyParser = require('body-parser');
const ResponseObject = require('../../schemas/transport/responseObject');

// Includes
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');

// Defaults
const DEFAULT_PROTOCOL = 'http';
//const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_HOST = '0.0.0.0'; // TODO: Change me, this is to make Docker happy if no config is supplied
const DEFAULT_PORT = 8000;
const DEFAULT_ACCESS_TOKEN = 'canvas-server-token';

// REST API defaults
const DEFAULT_API_BASE_PATH = '/rest';
const DEFAULT_API_VERSION = 'v1';

// Middleware functions
// TODO: Move to utils
function validateApiKey(key) {
    return (req, res, next) => {
        const apiKey = req.headers['authorization'] ||
            req?.query['access_token'] ||
            req?.body['access_token'] ||
            req?.params['access_token'];

        debug('Validating AUTH key');
        debug(`Auth Timestamp: ${new Date().toISOString()}`);
        debug(`User-Agent: ${req.get('User-Agent')}`);
        debug(`Request Method: ${req.method}`);
        debug(`Request URL: ${req.originalUrl}`);
        debug(`Client IP: ${req.ip}`);

        if (!apiKey) {
            debug('Unauthorized: No API Key provided');
            return res.status(401).send('Unauthorized: No API Key provided');
        }

        if (apiKey === `Bearer ${key}`) {
            debug('API Key validated successfully');
            next();
        } else {
            debug('Unauthorized: Invalid API Key');
            res.status(401).send('Unauthorized: Invalid API Key');
        }
    };
}

module.exports = validateApiKey;



class HttpTransport extends Service {
    #protocol;
    #host;
    #port;
    #auth;
    #apiVersion;

    constructor({
        protocol = DEFAULT_PROTOCOL,
        host = DEFAULT_HOST,
        port = DEFAULT_PORT,
        apiVersion = DEFAULT_API_VERSION,
        baseUrl = `${DEFAULT_API_BASE_PATH}/${apiVersion}`,
        auth = {
            token: DEFAULT_ACCESS_TOKEN,
            enabled: true,
        },
        ...options
    } = {}) {
        super(options);
        this.server = null;

        this.#protocol = protocol;
        this.#host = host;
        this.#port = port;
        this.#auth = auth;
        this.#apiVersion = apiVersion;
        this.restApiBasePath = baseUrl;

        // The really ugly part
        if (!options.canvas) {throw new Error('Canvas not defined');}
        this.canvas = options.canvas;

        if (!options.db) {throw new Error('DB not defined');}
        this.db = options.db;

        if (!options.contextManager) {throw new Error('contextManager not defined');}
        this.contextManager = options.contextManager;

        if (!options.sessionManager) {throw new Error('sessionManager not defined');}
        this.sessionManager = options.sessionManager;

        // Set the base path (as we only have one api version, this is ..fine)
        this.ResponseObject = ResponseObject; // TODO: Refactor

        // Workaround till I implement proper multi-context routes!
        this.session = this.sessionManager.createSession();
        //this.context = this.contextManager.getContext();
        this.context = this.session.getContext();

        debug(`HTTP Transport class initialized, protocol: ${this.#protocol}, host: ${this.#host}, port: ${this.#port}, rest base path: ${this.restApiBasePath}`);
        debug('Auth:', this.#auth.enabled ? 'enabled' : 'disabled');
    }

    async start() {
        const app = express();

        // Configure Middleware
        app.use(cors());
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        // Add CSP headers
        app.use((req, res, next) => {
            res.setHeader('Content-Security-Policy', "default-src 'self'");
            res.setHeader('Access-Control-Allow-Origin', '*');
            next();
        });

        /**
         * Common routes
         */

        // REST API Ping health check (unauthenticated)
        app.get(`${this.restApiBasePath}/ping`, (req, res) => {
            res.status(200).send('pong');
        });

        // Toggle API Key validation
        if (this.#auth.enabled) {
            app.use(validateApiKey(this.#auth.token));
        }

        /**
         * REST API routes
         */

        require('./rest/init')(app, this);

        // Create the HTTP server
        const server = http.createServer(app);

        /**
         * Socket.io routes
         */

        const io = socketIo(server);
        require('./socket.io/init')(io, this);

        /**
         * WebDAV
         */

        // require('./webdav/init')(app, this);

        server.listen(this.#port, this.#host, () => {
            console.log(`Server running at http://${this.#host}:${this.#port}/`);
        });

        this.server = server;
    }

    async stop() {
        if (this.server) {
            debug('Shutting down server...');
            this.server.close((err) => {
                if (err) {
                    console.error('Error shutting down server:', err);
                    process.exit(1);
                }
                console.log('Server gracefully shut down');
                process.exit(0);
            });

            // Close all socket.io connections
            if (this.io) {
                this.io.close();
            }
        }
    }

    async restart() {
        if (this.isRunning()) {
            await this.stop();
            await this.start();
        }
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
            connectedClients: clientsCount,
        };
    }

}

module.exports = HttpTransport;
