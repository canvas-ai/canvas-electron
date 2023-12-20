// Canvas service "interface"
const Service = require('../../managers/service/lib/Service');

// Utils
const debug = require('debug')('canvas-svc-rest')

// Services
const express = require('express');
const bodyParser = require('body-parser');


/**
 * Routes
 */

// Users
// Services
// Roles
// Apps

// Schemas
const schemasRoutes = require('./routes/schemas');

// Context
const contextRoutes = require('./routes/context');

// Documents
const documentsRoutes = require('./routes/documents');

// Index
const indexRoutes = require('./routes/index');

// Bitmaps
const bitmapRoutes = require('./routes/bitmaps');


// Defaults
const DEFAULT_PROTOCOL = 'http'
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3000
const API_KEY = 'canvas-json-api'

// Middleware function to validate the API key
const validateApiKey = (req, res, next) => {
    const receivedApiKey = req.get('API-KEY');
    if (receivedApiKey === API_KEY) {
        next();
    } else {
        console.log(`Unauthorized: Invalid API Key: ${receivedApiKey}`)
        res.status(401).send('Unauthorized: Invalid API Key');
    }
};

class ExpressService extends Service {

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

        console.log(`REST API listening at ${this.#protocol}://${this.#host}:${this.#port}`);
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
    }

    async restart() {
        if (this.isRunning()) {
            await this.stop();
            await this.start();
        }
    }
}

module.exports = ExpressService
