'use strict'


/**
 * Simple express.js JSON Rest API server
 */

// Load environment variables
const { app, user, transport } = require('../../env')

// Utils
const debug = require('debug')('canvas-svc-restapi')

// Config
const config = require('../../../config/jsonapi-server.json')

// Services
const express = require('express');
const bodyParser = require('body-parser');

//Routes
const contextRoutes = require('./routes/context');
const documentRoutes = require('./routes/document');
const documentsRoutes = require('./routes/documents');
//const indexRoutes = require('./routes/index');

// Constants, to be moved to config
const DEFAULT_PROTOCOL = config.protocol || 'http'
const DEFAULT_HOST = config.host || '127.0.0.1'
const DEFAULT_PORT = config.port || 3000
const API_KEY = config.key || 'canvas-json-api';

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


let server = null
let currentOptions = null;

exports.start = (context, index, options = {
    protocol: DEFAULT_PROTOCOL,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT
}) => {

    // Create an express.js server
    currentOptions = options;
    server = express();

    // Use body-parser middleware to parse JSON request bodies
    server.use(bodyParser.json());

    // Use the validateApiKey middleware for all routes
    server.use(validateApiKey);

    // Use the imported route files as middleware
    server.use('/context', (req, res, next) => {
        req.context = context;
        next();
    }, contextRoutes);

    server.use('/document', (req, res, next) => {
        req.context = context;
        req.index = index;
        next();
    }, documentRoutes);

    server.use('/documents', (req, res, next) => {
        req.context = context;
        req.index = index;
        next();
    }, documentsRoutes);

    // Start the server
    server.listen(options.port, () => {
        console.log(`JSON API listening at ${options.protocol}://${options.host}:${options.port}`);
    });

}

exports.stop = () => {
    if (server) {
        server.close();
        server = null;
    }
}

exports.restart = () => {
    if (server) { exports.stop(); }
    // TODO: Fix me
    exports.start(currentContext, currentIndex, currentOptions);
}

exports.status = () => {
    return {
        protocol: currentOptions.protocol,
        host: currentOptions.host,
        port: currentOptions.port,
        listening: server ? true : false
    }
}
