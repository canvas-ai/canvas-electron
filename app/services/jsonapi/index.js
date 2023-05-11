'use strict'


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


let app = null

exports.start = (context, index, options = {
    protocol: DEFAULT_PROTOCOL,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT
}) => {

    app = express();

    // Use body-parser middleware to parse JSON request bodies
    app.use(bodyParser.json());

    // Use the validateApiKey middleware for all routes
    app.use(validateApiKey);

    // Use the imported route files as middleware
    app.use('/context', (req, res, next) => {
        req.context = context;
        next();
    }, contextRoutes);
    

    app.use('/document', (req, res, next) => {
        req.context = context;
        req.index = index;
        next();
    }, documentRoutes);    

    app.use('/documents', (req, res, next) => {
        req.context = context;
        req.index = index;
        next();
    }, documentsRoutes);

    // Start the server
    app.listen(options.port, () => {
        console.log(`JSON API listening at ${options.protocol}://${options.host}:${options.port}`);
    });

}

exports.stop = () => {
    app.close()
}

exports.restart = () => {
    return true
}

exports.status = () => {
    return true
}
