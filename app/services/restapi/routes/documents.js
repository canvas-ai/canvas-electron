const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas-svc-jsonapi:documents');


// Define routes
router.get('/', async (req, res) => {

    let index = req.index;
    let context = req.context;

    let documents = await index.listDocuments(context.array);
    if (documents) {
        res.json(documents)
    } else {
        res.status(404).send('No documents found')
    }
})

router.get('/:abstr', (req, res) => {
    const abstr = req.params.abstr;

    let index = req.index;
    let context = req.context;

    let document = index.listDocuments(context.array, abstr)
    if (document) {
        res.json(document)
    } else {
        res.status(404).send('No documents found for type ' + abstr)
    }
})

router.post('/', (req, res) => {
    const id = Math.random().toString(36).substring(2)
    const document = req.body
    documents[id] = document
    res.json({ id })
})

router.put('/:id', (req, res) => {
    const id = req.params.id
    const document = req.body
    if (documents[id]) {
        documents[id] = document
        res.json({ message: 'Document updated' })
    } else {
        res.status(404).send('Document not found')
    }
})

router.delete('/:id', (req, res) => {
    const id = req.params.id
    if (documents[id]) {
        delete documents[id]
        res.json({ message: 'Document deleted' })
    } else {
        res.status(404).send('Document not found')
    }
})

module.exports = router;
