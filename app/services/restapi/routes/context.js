const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas-service-restapi:context');


/**
 * Context URL
 */

router.get('/url', (req, res) => {
    res.json({ url: req.context.url });
});

router.put('/url', (req, res) => {
    try {
        debug(`[PUT] Got context url "${req.body.url}`)
        req.context.set(req.body.url, req.body.autoCreateLayers);
        res.sendStatus(200);conte
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.post('/url', (req, res) => {
    try {
        debug(`[POST] Got context url "${req.body.url}`)
        debug(req.context.set(req.body.url, req.body.autoCreateLayers));
        res.sendStatus(200);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.get('/array', (req, res) => {
    res.json({ array: req.context.array });
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
    res.json({ path: req.context.paths });
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
    res.json({ contextArray: req.context.bitmaps });
});

router.get('/bitmaps/context', (req, res) => {
    res.json({ contextArray: req.context.contextArray });
});

router.get('/bitmaps/features', (req, res) => {
    res.json({ featureArray: req.context.featureArray });
});


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
