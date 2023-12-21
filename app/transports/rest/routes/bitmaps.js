const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas-svc-jsonapi:documents');


// Define routes
router.get('/', async (req, res) => {

    let context = req.context;
    let bitmaps = await context.bitmaps;
    if (bitmaps) {
        res.json(bitmaps)
    } else {
        res.status(404).send('No bitmaps found')
    }
})

module.exports = router;
