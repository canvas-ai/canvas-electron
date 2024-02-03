// Canvas service interface
const Service = require('../../managers/service/lib/Service');

// Utils
const debug = require('debug')('canvas-transport-rest')
const bodyParser = require('body-parser');
const ResponseObject = require('../../utils/ResponseObject');

// Includes
const express = require('express');
const cors = require('cors');

// Routes
const schemasRoutes = require('./routes/schemas');
const contextsRoutes = require('./routes/contexts');
const contextRoutes = require('./routes/context');
const documentsRoutes = require('./routes/documents');
const bitmapRoutes = require('./routes/bitmaps');

// Defaults
const DEFAULT_PROTOCOL = 'http'
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3000
const API_KEY = 'canvas-json-api'

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

class RestTransport extends Service {

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

        debug(`REST API Transport initialized, protocol: ${this.#protocol}, host: ${this.#host}, port: ${this.#port}`)
    }

    async start() {
        this.server = express();

		this.server.use(cors());
        this.server.use(bodyParser.json());
        this.server.use(validateApiKey);

        // Routes related to the /context endpoint
        this.server.use('/context', (req, res, next) => {
            req.context = this.context;
            req.ResponseObject = ResponseObject;
            next();
        }, contextRoutes);

        // Global documents endpoint
        this.server.use('/documents', (req, res, next) => {
            req.db = this.canvas.documents;
            req.ResponseObject = ResponseObject;
            next();
        }, documentsRoutes);

        await new Promise((resolve, reject) => {
            this.server.listen(this.#port, resolve).on('error', reject);
        });

        console.log(`REST API Service listening at ${this.#protocol}://${this.#host}:${this.#port}`);
    }

    async stop() {
        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err) { reject(err); }
                    else { resolve(); }
                });
            });

            this.server = null;
        }

        console.log('REST API service stopped');
    }

    async restart() {
        if (this.isRunning()) {
            await this.stop();
            await this.start();
        }
    }

    status() {
        if (!this.server) {
            return { listening: false };
        }

        return {
            protocol: this.#protocol,
            host: this.#host,
            port: this.#port,
            listening: true
        };
    }
}

module.exports = RestTransport
