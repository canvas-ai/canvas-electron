// Canvas service interface
const Service = require('../../managers/service/lib/Service');

// Utils
const debug = require('debug')('canvas-transport-rest')
const bodyParser = require('body-parser');

// Includes
const express = require('express');

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
        if (!options.context) throw new Error('Context not defined');
        this.context = options.context;

        debug(`REST API Transport initialized, protocol: ${this.#protocol}, host: ${this.#host}, port: ${this.#port}`)
    }

    async start() {
        this.server = express();

        this.server.use(bodyParser.json());
        this.server.use(validateApiKey);

        this.server.use('/context', (req, res, next) => {
            req.context = this.context;
            next();
        }, contextRoutes);

        this.server.use('/documents', (req, res, next) => {
            req.context = this.context;
            next();
        }, documentsRoutes);

        this.server.use('/schemas', (req, res, next) => {
            req.context = this.context;
            next();
        }, schemasRoutes);

        this.server.use('/bitmaps', (req, res, next) => {
            req.context = this.context;
            next();
        }, bitmapRoutes);

        await new Promise((resolve, reject) => {
            this.server.listen(this.#port, resolve).on('error', reject);
        });

        console.log(`REST API Service listening at ${this.#protocol}://${this.#host}:${this.#port}`);
    }

    async stop() {
        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
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
