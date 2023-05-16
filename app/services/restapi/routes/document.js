const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas-svc-jsonapi:documents');


// Define routes
router.get('/', async (req, res) => {

    let index = req.index;
    let documents = await index.listDocuments();

    if (documents) {
        res.json(documents)
    } else {
        res.status(404).send('No documents found')
    }
})

router.get('/:id', async (req, res) => {
    const id = req.params.id
    const document = await index.getDocuments(id)
    if (document) {
        res.json(document)        
    } else {
        res.status(404).send('Document not found')
    }
})


module.exports = router;
