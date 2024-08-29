// Includes
const express = require('express');
const router = express.Router();
const debug = require('debug')('canvas:transports:rest:sessions');


router.get('/', async (req, res) => {
    const sm = req.sessionManager;
    const response = new req.ResponseObject();

    const list = await sm.listSessions();
    debug('[GET] List sessions');
    res.status(200).json(response.success(list).getResponse());
});

router.post('/create', (req, res) => {
    const sm = req.sessionManager;
    const response = new req.ResponseObject();

    const sessionId = req.body.sessionId;
    const sessionOptions = req.body.sessionOptions || null;
    debug(`[POST] Create session with id: ${sessionId}, options: ${JSON.stringify(sessionOptions)}`);
    try {
        const result = sm.createSession(sessionId, sessionOptions);
        res.status(200).json(response.success(result).getResponse());
    } catch (error) {
        debug(`[POST] Create session error: ${error}`);
        res.status(400).json(response.error('Failed to create session '. error).getResponse());
    }
});


module.exports = router;
