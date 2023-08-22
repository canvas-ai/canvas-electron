const express = require('express');
const router = express.Router();

router.get('/context/tree', (req, res) => {
    res.json({ tree: context.tree });
});

router.get('/context/contextArray', (req, res) => {
    res.json({ contextArray: context.contextArray });
});

router.get('/context/featureArray', (req, res) => {
    res.json({ featureArray: context.featureArray });
});

module.exports = router;
