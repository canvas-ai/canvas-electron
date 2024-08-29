// Includes
const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas:transports:rest:contexts');

router.get('/contexts', (req, res) => {
    // List all contexts
    // Query string ?status=active | all (default)
    const params = req.query.paramName;
    const contextManager = req.contextManager;

    const response = new req.ResponseObject();
    const data = contextManager.listContexts(params);

    if (data) {
        res.status(200).json(response.success(data).getResponse());
    } else {
        res.status(500).json(response.error('Unable to fetch Canvas contexts').getResponse());
    }
});

router.post('/contexts', (req, res) => {
    // Create a new context
});

router.get('/contexts/:id', (req, res) => {
    // Gets the context id :id
});

router.patch('/contexts/:id', (req, res) => {
    // Update parameter for context id :id
});

router.get('/contexts/:id/url', (req, res) => {

});

router.put('/contexts/:id/url', (req, res) => {

});

router.get('/contexts/:id/array', (req, res) => {

});

router.get('/contexts/:id/path', (req, res) => {

});

router.put('/contexts/:id/path', (req, res) => {
    const context = req.context;
    const response = new req.ResponseObject();
    const path = req.body.path;
    const autoCreateLayers = req.body.autoCreateLayers;
    debug(`[PUT] Path route triggered with path: ${path}, autoCreateLayers: ${autoCreateLayers}`);
    if (!context.insertContextPath(path, autoCreateLayers)) {
        res.status(400).json(response.error('Unable to insert context path').getResponse());
    } else {
        res.status(200).json(response.success('Context path inserted successfully').getResponse());
    }
});

router.delete('/contexts/:id/path', (req, res) => {
    const context = req.context;
    const response = new req.ResponseObject();
    const path = req.body.path;
    const recursive = req.body.recursive;
    debug(`[DELETE] Path route triggered with path: ${path}, recursive: ${recursive}`);

    if (!context.removeContextPath(path, recursive)) {
        res.status(400).json(response.error('Unable to remove context path ' + path).getResponse());
    } else {
        res.status(200).json(response.success('Context path removed successfully').getResponse());
    }
});

router.get('/contexts/:id/layers', (req, res) => {
    // Get context layers for context with id :id
});

router.get('/contexts/:id/bitmaps', (req, res) => {
    // Get context bitmaps for context with id :id
});

router.get('/contexts/:id/documents', (req, res) => {
    // List all documents for context id :id
});

router.get('/contexts/:id/documents/:abstraction', (req, res) => {
    // List all documents of type :abstraction for context id :id
});
