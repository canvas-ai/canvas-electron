const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas/transports/rest:documents');

/**
 * Canvas document DB routes
 */

// Insert documents to the database
router.post('/', async (req, res) => {
    const context = req.context;
    const response = new req.ResponseObject();
    const documentArray = req.body.document;
    const contextArray = req.body.contextArray;
    const featureArray = req.body.featureArray;
    const filterArray = req.body.filterArray;

    try {
        await context.insertDocumentArray(
            documentArray,
            contextArray,
            featureArray,
            filterArray
        );
        debug('[POST] Documents route triggered');
        res.status(200).json(response.success('Document inserted successfully').getResponse());
    } catch (error) {
        res.status(400).json(response.error('Failed to insert documents: '. error).getResponse());
    }
});

// List all documents
router.get('/', async (req, res) => {
    const db = req.db;
    const response = new req.ResponseObject();

    try {
        const documents = await db.listDocuments();
        res.status(200).json(response.success(documents, 'Documents retrieved successfully').getResponse());
    } catch (error) {
        console.error(error);
        res.status(500).json(response.error('Failed to retrieve documents', error).getResponse());
    }
});



// Get a document by ID
router.get('/id/:id', async (req, res) => {
    const db = req.db;
    const response = new req.ResponseObject();
    const id = req.params.id;

    try {
        const document = await db.getDocumentByID(id);
        if (document) {
            res.status(200).json(response.success(document, 'Document retrieved successfully').getResponse());
        } else {
            res.status(404).json(response.error(`Document not found for id ${id}`).getResponse());
        }
    } catch (error) {
        console.error(error);
        res.status(500).json(response.error(`Failed to retrieve document for id ${id}`, error).getResponse());
    }
});

// Get documents by abstraction
router.get('/abstr/:abstr', async (req, res) => {
    const db = req.db;
    const response = new req.ResponseObject();
    const abstraction = 'data/abstraction/' + req.params.abstr;

    try {
        const documents = await db.listDocuments(abstraction);
        if (documents) {
            res.status(200).json(response.success(documents, 'Documents retrieved successfully').getResponse());
        } else {
            res.status(404).json(response.error('No documents found for type ' + abstraction).getResponse());
        }
    } catch (error) {
        console.error(error);
        res.status(500).json(response.error(`Failed to retrieve documents for type ${abstraction}`, error).getResponse());
    }
});

// Create a new document
router.post('/', async (req, res) => {
    const db = req.db;
    const response = new req.ResponseObject();
    const document = req.body;

    try {
        let result = await db.createDocument(document);
        if (result.status === "error") {
            res.status(500).json(response.error(result.message).getResponse());
        } else {
            res.status(200).json(response.success(null, result.message).getResponse());
        }
    } catch (error) {
        console.error(error);
        res.status(500).json(response.error('Failed to create document', error).getResponse());
    }
});

// Update a document
router.put('/:id', async (req, res) => {
    const db = req.db;
    const response = new req.ResponseObject();
    const id = req.params.id;
    const document = req.body;

    try {
        let result = await db.updateDocument(id, document);
        if (result.status === "error") {
            res.status(500).json(response.error(result.message).getResponse());
        } else {
            res.status(200).json(response.success(null, result.message).getResponse());
        }
    } catch (error) {
        console.error(error);
        res.status(500).json(response.error(`Failed to update document with id ${id}`, error).getResponse());
    }
});

// Delete a document
router.delete('/:id', async (req, res) => {
    const db = req.db;
    const response = new req.ResponseObject();
    const id = req.params.id;

    try {
        const documentExists = await db.getDocumentByID(id);
        if (documentExists) {
            await db.deleteDocument(id);
            res.status(200).json(response.success(null, 'Document deleted successfully').getResponse());
        } else {
            res.status(404).json(response.error('Document not found').getResponse());
        }
    } catch (error) {
        console.error(error);
        res.status(500).json(response.error(`Failed to delete document with id ${id}`, error).getResponse());
    }
});

module.exports = router;
