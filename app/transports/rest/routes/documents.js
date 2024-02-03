const express = require('express');
const router = express.Router();

// Define routes
router.get('/', async (req, res) => {
    const db = req.db;
    const documents = await db.listDocuments();

    if (documents) {
        res.json(documents);
    } else {
        res.status(404).send('No documents found');
    }
});

router.get('/id/:id', (req, res) => {
    const db = req.db;
    const id = req.params.id;
    const document = db.getDocumentByID(id);

    if (document) {
        res.status(200).json(document);
    } else {
        res.status(404).send(`Document not found for id ${id}`);
    }
});

router.get('/abstr/:abstr', async (req, res) => {
    const db = req.db;
    const abstraction = 'data/abstraction/' + req.params.abstr;
    const documents = await db.listDocuments(abstraction);
    if (documents) {
        res.status(200).json(documents);
    } else {
        res.status(404).send('No documents found for type ' + abstraction);
    }
});

router.post('/', async (req, res) => {
    const db = req.db;
    const document = req.body;
    
    let ret = await db.createDocument(document);
    if (ret.status === "error") {
        res.status(500).send(ret.message);
    } else {
        res.status(200).json({ message: ret.message });
    }
});

router.put('/:id', async (req, res) => {
    const db = req.db;
    const id = req.params.id;
    const document = req.body;
    
    let ret = await db.updateDocument(id, document);
    if (ret.status === "error") {
        res.status(500).send(ret.message);
    } else {
        res.status(200).json({ message: ret.message });
    }
});

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
