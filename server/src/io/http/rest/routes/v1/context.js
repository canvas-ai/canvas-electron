// Includes
const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas:transports:rest:context');


/**
 * Current context
 * ! Legacy API left for backward compatibility
 * ! Please use /contexts/<context-identifier>/<endpoint> instead
 */

router.get('/url', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.createSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const url = context.url;
    debug(`[GET] URL route triggered with url: ${url}`);
    res.status(200).json(response.success(url).getResponse());
});

router.put('/url', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const url = req.body.url;
    const autoCreateLayers = req.body.autoCreateLayers || true;
    debug(`[PUT] URL route triggered with url: ${url}, autoCreateLayers: ${autoCreateLayers}`);
    try {
        context.set(url, autoCreateLayers);
        res.status(200).json(response.success(url, 'Context set successfully').getResponse());
    } catch (error) {
        console.error(error);
        res.status(400).json(response.error('Unable to set context to url ' + url, error).getResponse());
    }
});

router.post('/url', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const url = req.body.url;
    const autoCreateLayers = req.body.autoCreateLayers || true;
    debug(`[POST] URL route triggered with url: ${url}, autoCreateLayers: ${autoCreateLayers}`);
    try {
        context.set(url, autoCreateLayers);
        res.status(200).json(response.success(url, 'Context set successfully').getResponse());
    } catch (error) {
        console.error(error);
        res.status(400).json(response.error('Unable to set context to url ' + url, error).getResponse());
    }
});

router.get('/array', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const pathArray = context.pathArray;
    debug('[GET] Array route triggered');
    res.status(200).json(response.success(pathArray).getResponse());
});


/**
 * Tree/Path manipulation
 */

router.get('/tree', (req, res) => {
    const context = req.context;
    const response = new req.ResponseObject();
    const tree = context.tree;
    debug('[GET] Tree route triggered');
    res.status(200).json(response.success(tree).getResponse());
});

router.get('/path', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const path = context.path;
    debug('[GET] Path route triggered');
    res.status(200).json(response.success(path).getResponse());
});

router.get('/paths', (req, res) => {
    const context = req.context;
    const response = new req.ResponseObject();
    const paths = context.paths;
    debug('[GET] Paths route triggered');
    res.status(200).json(response.success(paths).getResponse());
});

router.put('/path', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

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

router.delete('/path', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

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

// TODO: Rework, commenting out for now
/*router.patch('/path', (req, res) => {
    const context = req.context;
    const response = new req.ResponseObject();
    const operation = req.body.operation;
    const path = req.body.path;
    const newPath = req.body.newPath;
    const recursive = req.body.recursive;

    if (operation === 'copy') {
        context.copyPath(path, newPath, recursive);
        res.sendStatus(200);
    } else if (operation === 'move') {
        context.movePath(path, newPath, recursive);
        res.sendStatus(200);
    } else {
        res.status(400).send(`Unknown operation "${operation}"`);
    }
});*/


/**
 * Layers
 */

router.get('/layers', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const layers = context.listLayers();
    debug('[GET] Layers route triggered');
    res.status(200).json(response.success(layers).getResponse());
});

router.get('/layers/:name', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const name = req.params.name;
    const layer = context.getLayer(name);
    debug(`[GET] Layer route triggered with name: ${name}`);
    if (layer) {
        res.status(200).json(response.success(layer).getResponse());
    } else {
        res.status(404).json(response.error(`Layer "${name}" not found`).getResponse());
    }
});

router.patch('/layers/:name', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const name = req.params.name;
    const options = req.params.options;

    let layer = context.getLayer(name);
    if (!layer) {
        res.status(404).json(response.error(`Layer "${name}" not found`).getResponse());
        return;
    }

    if (context.updateLayer(layer, options)) {
        debug(`[PATCH] Layer route triggered with name: ${name}`);
        res.status(200).json(response.success(`Layer ${name} updated successfully`).getResponse());
    } else {
        res.status(401).json(response.error(`Unable to update layer "${name}"`).getResponse());
    }
});


/**
 * Bitmaps
 */

router.get('/bitmaps', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const bitmaps = context.bitmaps;
    debug('[GET] Bitmaps route triggered');
    res.status(200).json(response.success(bitmaps).getResponse());
});

router.get('/bitmaps/context', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const contextArray = context.contextArray;
    debug('[GET] Bitmaps context route triggered');
    res.status(200).json(response.success(contextArray).getResponse());
});

router.get('/bitmaps/features', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const featureArray = context.featureArray;
    debug('[GET] Bitmaps features route triggered');
    res.status(200).json(response.success(featureArray).getResponse());
});


/**
 * Documents
 */

router.get('/documents', async (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const includeData = req.query.includeData === 'true'; // Checks if includeData query param is 'true'

    try {
        let documents;
        if (includeData) {
            documents = await context.getDocuments(); // Fetch full documents
        } else {
            documents = await context.listDocuments(); // Fetch only metadata
        }
        debug('[GET] Documents route triggered with includeData:', includeData);

        if (documents.length > 0) {
            res.json(response.success(documents).getResponse());
        } else {
            res.status(404).send(response.error(`No documents found in context ${context.url}`).getResponse());
        }
    } catch (error) {
        console.error('[ERROR] Fetching documents:', error);
        res.status(500).send(response.error('Internal server error while retrieving documents').getResponse());
    }
});


router.post('/documents', async (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const documentArray = req.body.documentArray;
    const featureArray = req.body.featureArray;
    const filterArray = req.body.filterArray;
    debug('[POST] Documents route triggered');

    try {
        await context.insertDocumentArray(
            documentArray,
            featureArray,
            filterArray,
        );
        res.status(200).json(response.success('Documents inserted successfully').getResponse());
    } catch (error) {
        res.status(400).json(response.error('Failed to insert documents: '. error).getResponse());
    }
});


/**
 * Misc
 */

//router.get('/user', (req, res) => {  });
router.get('/stats', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const stats = context.stats();
    debug('[GET] Stats route triggered');
    res.status(200).json(response.success(stats).getResponse());
});

router.get('/user/home', (req, res) => {
    let context;
    let session;

    // Session overrides
    const sessionId = req.body.sessionId || req.query.sessionId;
    const contextId = req.body.contextId || req.query.contextId;

    // Check if session is available
    if (sessionId) {
        session = req.sessionManager.getSession(sessionId);
        context = session.getContext();
    } else {
        context = req.context;
    }

    const response = new req.ResponseObject();
    const userDataHome = context.userDataHome;
    debug('[GET] User home route triggered');
    res.json(response.success(userDataHome).getResponse());
});


module.exports = router;
