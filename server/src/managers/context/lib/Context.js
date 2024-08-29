// Utils
const debug = require('debug')('canvas:context');
const EE = require('eventemitter2');
const { uuid12 } = require('./utils');

// App includes
const Url = require('./Url');

// Module defaults
const CONTEXT_AUTOCREATE_LAYERS = true;
const CONTEXT_URL_PROTO = 'universe';
const CONTEXT_URL_BASE = '/';
const CONTEXT_URL_BASE_ID = 'universe';


/**
 * Canvas Context
 */

class Context extends EE {

    #id;
    #systemContext;

    #sessionId;
    #baseUrl;
    #url;
    #path;
    #array;

    #layerIndex;
    #tree;

    // System (server) context
    // - Location/network, runtime context
    // Client (user/app) context
    // - Sent to the server by each client(eg. client/os/linux, client/user/user1, client/app/obsidian, client/network/)
    // User context
    // - context path/tree layers

    #contextArray = [];
    #featureArray = [];
    #filterArray = [];

    #ephemeral = {};


    // TODO: Refactor to not set the context url in the constructor
    constructor(url, db, tree, options = {}) {
        // Initialize event emitter
        super({
            wildcard: false, // set this to `true` to use wildcards
            delimiter: '/', // set the delimiter used to segment namespaces
            newListener: false, // set this to `true` if you want to emit the newListener event
            removeListener: false, // set this to `true` if you want to emit the removeListener event
            maxListeners: 100, // the maximum amount of listeners that can be assigned to an event
            verboseMemoryLeak: false, // show event name in memory leak message when more than maximum amount of listeners is assigned
            ignoreErrors: false, // disable throwing uncaughtException if an error event is emitted and it has no listeners
        });

        // Generate a runtime uuid
        this.#id = options?.id || uuid12();
        //if (options.system) { throw new Error('Global system context not provided'); }
        this.#systemContext =  options?.system;

        this.#sessionId = options?.sessionId || 'default'; // Throw?
        this.documents = db;

        this.#tree = tree;
        this.#layerIndex = this.#tree.layers; // TODO: Refactor

        // Set the base url
        let baseUrl = options.baseUrl || CONTEXT_URL_BASE; // Throw?
        this.#baseUrl = baseUrl.startsWith('/') ? baseUrl : '/' + baseUrl;

        // Set the context url
        this.setUrl(
            url ? url : CONTEXT_URL_PROTO + '://' + CONTEXT_URL_BASE,
            CONTEXT_AUTOCREATE_LAYERS,
        );

        debug(`Context with url "${this.#url}", session id: "${this.#sessionId}", baseUrl: "${this.#baseUrl}" initialized`);
    }

    /**
	 * Getters
	 */

    get id() {
        return this.#id;
    }

    get sessionId() {
        return this.#sessionId;
    }

    get baseUrl() {
        return this.#baseUrl;
    }

    get url() {
        return this.#url;
    }

    get path() {
        return this.#path;
    }

    get pathArray() {
        return this.#array;
    }

    get tree() {
        return this.#tree.getJsonTree();
    }
    get paths() {
        return this.#tree.paths;
    }

    // layers
    // features
    // filters

    get bitmaps() {
        return {
            context: this.#contextArray,
            features: this.#featureArray,
            filters: this.#filterArray,
        };
    }

    get contextArray() {
        return this.#contextArray;
    }
    get featureArray() {
        return this.#featureArray;
    }
    get features() {
        return this.#featureArray;
    }
    get filterArray() {
        return this.#filterArray;
    }
    get filters() {
        return this.#filterArray;
    }

    // List all apps linked to this context
    get apps() {
        return [];
    }

    // List all identities linked to this context
    get identities() {
        return [];
    }

    /**
	 * Context management
	 */

    set url(url) {
        this.setUrl(url);
    }

    set(url = CONTEXT_URL_BASE, autoCreateLayers = CONTEXT_AUTOCREATE_LAYERS) {
        return this.setUrl(url, autoCreateLayers);
    }

    setUrl(url, autoCreateLayers = CONTEXT_AUTOCREATE_LAYERS) {
        // Validate the URL
        if (!Url.validate(url)) {
            throw new Error(`Invalid context URL "${url}"`);
        }

        const parsed = new Url(url, this.#baseUrl);
        if (this.#url === parsed.url) {return this.#url;}

        debug(`Setting context url for context "${this.#id}", session ID "${this.#sessionId}" to "${parsed.url}"`);
        if (!this.#tree.insert(parsed.path, null, autoCreateLayers)) {
            debug( `Context url "${parsed.url}" not set, path "${parsed.path}" not found`);
            return false;
        }

        // Update context variables
        this.#url = parsed.url;
        this.#path = parsed.path;
        this.#array = parsed.array;

        // TODO: Move to the tree class
        this.#initializeLayers(parsed.array);

        this.emit('url', this.#url);
        this.emit('update', this.stats()); // Test
        return this.#url;
    }

    importContextData(json) {

    }

    exportContextData(oidArray = []) {

    }


    /**
	 * Layer management
	 */

    hasLayer(name) {
        return this.#layerIndex.hasLayerName(name);
    }

    getLayer(name) {
        return this.#layerIndex.getLayerByName(name);
    }

    addLayer(layer) {
        return this.#layerIndex.addLayer(layer);
    }

    layerNameToID(name) {
        return this.#layerIndex.nameToID(name);
        //return this.#layerIndex.getLayerByName(name)?.id
    }

    createLayer(name, options) {
        return this.#layerIndex.createLayer(name, options);
    }

    updateLayer(name, options) {
        return this.#layerIndex.updateLayer(name, options);
    }

    renameLayer(name, newName) {
        return this.#layerIndex.renameLayer(name, newName);
    }

    deleteLayer(name) {
        return this.#layerIndex.removeLayerByName(name);
    }

    listLayers() {
        return this.#layerIndex.list();
    }

    /**
	 * Context tree management
	 */

    parseContextPath(path) {
        let parsed = new Url(path);
        return parsed.path;
    }

    insertContextPath(path, autoCreateLayers = CONTEXT_AUTOCREATE_LAYERS) {
        return this.#tree.insert(path, null, autoCreateLayers);
    }

    removeContextPath(path, recursive = false) {
        return this.#tree.remove(path, recursive);
    }

    moveContextPath(path, newPath, recursive) {
        return this.#tree.move(path, newPath, recursive);
    }

    copyContextPath(path, newPath, recursive) {
        return this.#tree.copy(path, newPath, recursive);
    }

    saveContextTree() {
        return this.#tree.save();
    }

    updateContextTreeFromJson(json) {
        return this.#tree.load(json);
    }

    /**
	 * neurald methods
	 */

    query(
        query,
        ctxArr = this.#contextArray,
        ftArr = this.#featureArray,
        filArr = this.#filterArray,
    ) {}


    /**
	 * Features
	 */

    insertFeature(feature) {}
    updateFeature(feature) {}
    removeFeature(feature) {}
    listActiveFeatures() {}
    listFeatures() {}


    /**
	 * Filters
	 */

    insertFilter(filter) {}
    updateFilter(filter) {}
    removeFilter(filter) {}
    listActiveFilters() {}
    listFilters() {}


    /**
	 * Data store methods
	 */

    async listDocuments(featureArray = this.#featureArray, filterArray = this.#filterArray) {
        if (typeof featureArray === 'string') {featureArray = [featureArray];}
        debug(`Listing documents linked to context "${this.#url}"`);
        debug(`Context array: "${this.#contextArray}"`);
        debug(`Feature array: "${featureArray}"`);
        debug(`Filter array: "${filterArray}"`);
        const result = await this.documents.listDocuments(
            this.#contextArray,
            featureArray,
            filterArray,
        );

        return result;
    }

    // TODO: Refactor the whole interface
    getDocument(id) {
        // TODO: Should also pass this.#contextArray and return null if the ID is not part of the current context!
        return this.documents.getDocument(id);
    }

    // TODO: Refactor the whole interface
    getDocumentByHash(hash) {
        // TODO: Should also pass this.#contextArray and return null if the ID is not part of the current context!
        return this.documents.getDocumentByHash(hash);
    }

    async getDocuments(featureArray = this.#featureArray, filterArray = this.#filterArray) {
        if (typeof featureArray === 'string') {featureArray = [featureArray];}
        debug(`Getting documents linked to context "${this.#url}"`);
        debug(`Context array: "${this.#contextArray}"`);
        debug(`Feature array: "${featureArray}"`);
        debug(`Filter array: "${filterArray}"`);
        const result = this.documents.getDocuments(
            this.#contextArray,
            featureArray,
            filterArray,
        );
        return result;
    }

    async insertDocument(document, featureArray = this.#featureArray, batchOperation = false /* temporary hack */) {
        if (typeof featureArray === 'string') {featureArray = [featureArray];}
        const result = await this.documents.insertDocument(
            document,
            this.#contextArray,
            featureArray,
        );
        debug(`insertDocument() result ${result}`);
        if (!batchOperation) {this.emit('data', 'insertDocument', result);}
        return result;
    }

    async insertDocumentArray(docArray, featureArray = this.#featureArray) {
        debug(`Inserting document array to context "${this.#url}"`);
        debug(`Feature array: ${featureArray}`);
        if (typeof featureArray === 'string') {featureArray = [featureArray];}
        const result = await this.documents.insertDocumentArray(
            docArray,
            this.#contextArray,
            featureArray,
            true,
        );
        debug(`insertDocumentArray() result ${result}`);
        this.emit('data', 'insertDocumentArray', result);
        return result;
    }

    async updateDocument(document, contextArray, featureArray) {
        if (typeof featureArray === 'string') {featureArray = [featureArray];}
        const result = await this.documents.updateDocument(
            document,
            this.#contextArray,
            featureArray,
        );
        this.emit('data', 'updateDocument', result);
        return result;
    }

    async updateDocumentArray(documentArray) {}

    async removeDocument(id) {
        if (this.#path === '/') {
            throw new Error(`Cannot remove document ID "${id}" from universe, use deleteDocument() instead`);
        }

        debug(`Removing document with id "${id}" from context "${this.#url}"`);
        if (typeof id !== 'string' && typeof id !== 'number') {
            throw new Error(`Document ID must be of type string or number, "${typeof id}" given`);
        }

        const result = await this.documents.removeDocument(id, this.#contextArray);
        this.emit('data', 'removeDocument', result);
        return result;
    }

    async removeDocumentArray(idArray) {
        debug(`Removing document array from context "${this.#url}"`);
        if (!Array.isArray(idArray)) {
            throw new Error(`Document ID array must be of type array, "${typeof idArray}" given`);
        }

        const result = await this.documents.removeDocumentArray(idArray, this.#contextArray);
        return result;
    }

    async deleteDocument(id) {
        debug(`Deleting document with id "${id}" from Canvas"`);
        if (typeof id !== 'string' && typeof id !== 'number') {
            throw new Error(`Document ID must be of type string or number, "${typeof id}" given`);
        }

        const result = await this.documents.deleteDocument(id);
        this.emit('data', 'deleteDocument', result);
        return result;
    }

    async deleteDocumentArray(idArray) {
        debug('Deleting document array from Canvas"');
        if (!Array.isArray(idArray)) {
            throw new Error(`Document ID array must be of type array, "${typeof idArray}" given`);
        }

        const result = await this.documents.deleteDocumentArray(idArray);
        return result;
    }

    getDocumentSchema(schema = 'default') {
        return this.documents.getDocumentSchema(schema);
    }


    /**
	 * Misc
	 */

    getEventListeners() {
        return this.eventNames();
    }

    stats() {
        return {
            id: this.#id,
            sessionId: this.#sessionId,
            baseUrl: this.#baseUrl,
            url: this.#url,
            path: this.#path,
            array: this.#array,
            contextArray: this.#contextArray,
            featureArray: this.#featureArray,
            filterArray: this.#filterArray,
        };
    }

    // Clean up resources associated with this context
    destroy() {
        debug(`Destroying context "${this.#id}"`);

        // Emit a "destroy" event
        this.emit('destroy');

        // Remove all listeners from the event emitter
        this.removeAllListeners();

        // Set private fields to null to release memory
        this.#id = null;
        this.#sessionId = null;
        this.#url = null;
        this.#baseUrl = null;
        this.#path = null;
        this.#array = null;
        this.#contextArray = null;
        this.#featureArray = null;
        this.#filterArray = null;
    }

    /**
	 * Internal methods
	 */

    #initializeTreeEventListeners() {
        this.#tree.on('update', (tree) => {
            this.emit('context:tree:update', tree);

        });

        /* this.#tree.on('insert', (tree) => {
				this.emit('context:tree:insert', tree)
			})
			this.#tree.on('remove', (tree) => {
				this.emit('context:tree:remove', tree)
			})
			this.#tree.on('update', (tree) => {
				this.emit('context:tree:update', tree)
			})*/
    }

    #initializeLayers(
        layerArray = [],
        autoCreateLayers = CONTEXT_AUTOCREATE_LAYERS,
    ) {
        let ctxArr = [];
        let ftArr = [];
        let filArr = [];

        layerArray.forEach((layerName) => {
            let layer = !this.#layerIndex.hasLayerName(layerName) && autoCreateLayers
                ? this.createLayer(layerName)
                : this.#layerIndex.getLayerByName(layerName);

            if (!layer) {
                debug(`Layer "${layerName}" not found and autoCreateLayers is set to false, skipping initialization`);
                return; // TODO: FIXME
            }

            ctxArr.push(layer.id);
            ftArr.push(...layer.featureBitmaps);
            filArr.push(...layer.filterBitmaps);
        });

        this.#initializeContextBitmaps(ctxArr);
        this.#initializeFeatureBitmaps(ftArr);
        this.#initializeFilterBitmaps(filArr);
    }

    #initializeContextBitmaps(arr) {
        // Clear local context map
        this.#contextArray.length = 0;
        arr.forEach((uuid) => {
            debug(`Adding context bitmap UUID "${uuid}" to contextArray`);
            this.#contextArray.push(uuid);
        });
    }

    #initializeFeatureBitmaps(arr) {
        // Clear local feature map
        this.#featureArray.length = 0;
        arr.forEach((uuid) => {
            debug(`Adding feature bitmap UUID "${uuid}" to context featureArray`);
            this.#featureArray.push(uuid);
        });
    }

    #initializeFilterBitmaps(arr) {
        // Clear local filter map
        this.#filterArray.length = 0;
        arr.forEach((uuid) => {
            debug(`Adding filter bitmap UUID "${uuid}" to context filterArray`);
            this.#filterArray.push(uuid);
        });
    }

    #parseContextArray(arr) {
        let parsed = arr.flatMap((element) => {
            return element.includes('/') ? element.split('/') : element;
        });

        return parsed.filter((x, i, a) => a.indexOf(x) === i);
        // return [... new Set(parsed)]
    }
}

module.exports = Context;
