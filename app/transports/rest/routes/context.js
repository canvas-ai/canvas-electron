const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas-transport-rest:context');

/**
 * Current context
 */

router.get('/url', (req, res) => {
    res.json({ url: req.context.url });
});

router.put('/url', (req, res) => {
    try {
        debug(`[PUT] Got context url "${req.body.url}`)
        req.context.set(req.body.url, req.body.autoCreateLayers);
        res.sendStatus(200);
    } catch (error) {
        console.error(error)
        res.status(400).send(error.message);
    }
});

router.post('/url', (req, res) => {
    try {
        debug(`[POST] Got context url "${req.body.url}`)
        debug(req.context.set(req.body.url, req.body.autoCreateLayers));
        res.sendStatus(200);
    } catch (error) {
        console.error(error)
        res.status(400).send(error.message);
    }
});

router.get('/array', (req, res) => {
    res.json({ array: req.context.pathArray });
});


/**
 * Tree/Path manipulation
 */

router.get('/tree', (req, res) => {
    res.json({ tree: req.context.tree });
});

router.get('/path', (req, res) => {
    res.json({ path: req.context.path });
});

router.get('/paths', (req, res) => {
    res.json({ paths: req.context.paths });
});

router.put('/path', (req, res) => {
    try {
        req.context.insertPath(req.body.path, req.body.autoCreateLayers);
        res.sendStatus(200);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.delete('/path', (req, res) => {
    req.context.removePath(req.body.path);
    res.sendStatus(200);
});

router.patch('/path', (req, res) => {
    if (req.body.operation === 'copy') {
        req.context.copyPath(req.body.path, req.body.newPath, req.body.recursive);
        res.sendStatus(200);
    } else if (req.body.operation === 'move') {
        req.context.movePath(req.body.path, req.body.newPath, req.body.recursive);
        res.sendStatus(200);
    } else {
        res.status(400).send(`Unknown operation "${req.body.operation}"`);
    }
});


/**
 * Layers
 */

router.get('/layers', (req, res) => {
    res.json({ layers: req.context.listLayers() });
});

router.get('/layers/:name', (req, res) => {
    const layer = req.context.getLayer(req.params.name);
    if (layer) {
        res.json(layer);
    } else {
        res.status(404).send(`Layer "${req.params.name}" not found`);
    }
});

router.patch('/layers/:name', (req, res) => {

    let layer = req.context.getLayer(req.params.name);
    if (!layer) {
        res.status(404).send(`Layer "${req.params.name}" not found`);
        return;
    }

    if (req.context.updateLayer(layer, req.params.options)) {
        res.json({ success: true });
    } else {
        res.status(401).send(`Unable to update layer "${req.params.name}"`);
    }
});


/**
 * Bitmaps
 */

router.get('/bitmaps', (req, res) => {
    res.json({ contextBitmaps: req.context.bitmaps });
});

router.get('/bitmaps/context', (req, res) => {
    res.json({ contextBitmapArray: req.context.contextArray });
});

router.get('/bitmaps/features', (req, res) => {
    res.json({ featureBitmapArray: req.context.featureArray });
});


/**
 * Documents
 */

router.get('/documents', async (req, res) => {
    let context = req.context;
    let documents = await context.listDocuments();

    if (documents) {
        res.json(documents)
    } else {
        res.status(404).send(`No documents found in context ${context.url}`)
    }
});

router.post('/documents', async (req, res) => {
    try {
        await req.context.insertDocument(req.body.document, req.body.contextArray, req.body.featureArray, req.body.filterArray);
        res.sendStatus(200);
    } catch (error) {
        res.status(400).send(error.message);
    }
})


/**
 * Misc
 */

//router.get('/user', (req, res) => {  });

router.get('/stats', (req, res) => {
    res.json(req.context.stats());
});

router.get('/user/home', (req, res) => {
    res.json({ userDataHome: req.context.userDataHome });
});


module.exports = router;
