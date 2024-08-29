// Utils
const debug = require('debug')('canvas:transports:http:rest');

// Routes v2
const contextsRoutes = require('./routes/v2/contexts.js');
const dataRoutes = require('./routes/v2/data.js');
const indexRoutes = require('./routes/v2/index.js');
const sessionsRoutes = require('./routes/v2/sessions.js');
const treeRoutes = require('./routes/v2/tree.js');

module.exports = (app, parent) => {
    // TODO: Add logic for loading routes based on the version
    debug('Initializing REST API routes v2');


    /**
     * Core services
     */

    app.use(`${parent.restApiBasePath}/contexts`, (req, res, next) => {
        req.contextd = parent.contextd;
        req.ResponseObject = parent.ResponseObject;
        next();
    }, contextsRoutes);

    app.use(`${parent.restApiBasePath}/data`, (req, res, next) => {
        req.stored = parent.stored;
        req.ResponseObject = parent.ResponseObject;
        next();
    }, dataRoutes);

    app.use(`${parent.restApiBasePath}/index`, (req, res, next) => {
        req.indexd = parent.indexd;
        req.ResponseObject = parent.ResponseObject;
        next();
    }, indexRoutes);


    /**
     * Managers
     */

    app.use(`${parent.restApiBasePath}/sessions`, (req, res, next) => {
        req.sessionManager = parent.sessionManager;
        req.ResponseObject = parent.ResponseObject;
        next();
    }, sessionsRoutes);


    /**
     * Global objects
     */

    app.use(`${parent.restApiBasePath}/tree`, (req, res, next) => {
        req.tree = parent.tree;
        req.ResponseObject = parent.ResponseObject;
        next();
    }, treeRoutes);

    // stats
    // status

};
