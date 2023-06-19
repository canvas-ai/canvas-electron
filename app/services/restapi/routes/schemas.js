const express = require('express');
const router = express.Router();

// Define routes
router.get('/', async (req, res) => {
    let index = req.index;
    const schemas = await index.listDocumentSchemas();

    if (schemas) {
        res.json(schemas)
    } else {
        res.status(404).send('No Document schemas found')
    }
})

router.get('/data/abstr/:type/:version?', (req, res) => {
    let index = req.index;
    const type = req.params.type;
    const version = req.params.version || null;

    try {
        const schema = index.getDocumentSchema(type, version);
        res.status(200).json(schema);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});



module.exports = router;
