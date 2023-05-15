'use strict'


// Utils
const path = require('path')
const debug = require('debug')('canvas-context')
const EE = require('eventemitter2')
const crypto = require('crypto')
const uuid12 = () => {
    return ([1e3]+-1e3+-1e3).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16))
}

// App includes
const {
    app,
    user,
} = require('../../env')

const Url = require('./lib/Url')
const Layer = require('./lib/Layer')
const LayerIndex = require('./lib/LayerIndex')
const Tree = require('./lib/Tree')
const TreeIndex = require('./lib/TreeIndex')

// Constants
const CONTEXT_AUTOCREATE_LAYERS = true
const CONTEXT_URL_PROTO = 'universe'
const CONTEXT_URL_BASE = "/"
const CONTEXT_URL_HISTORY_SIZE = 512

/**
 * Canvas Context
 */

class Context extends EE {

    #id;
    #url = CONTEXT_URL_PROTO + '://' + CONTEXT_URL_BASE;
    #path = CONTEXT_URL_BASE;
    #array;
    #layerIndex;
    #treeIndex;
    #tree;

    #contextArray = [];
    #featureArray = [];
    #filterArray = [];

    constructor(url, options = {}) {

        // Initialize event emitter
        super({
            wildcard: false,            // set this to `true` to use wildcards
            delimiter: '/',             // set the delimiter used to segment namespaces
            newListener: false,         // set this to `true` if you want to emit the newListener event
            removeListener: false,      // set this to `true` if you want to emit the removeListener event
            maxListeners: 100,          // the maximum amount of listeners that can be assigned to an event
            verboseMemoryLeak: false,   // show event name in memory leak message when more than maximum amount of listeners is assigned
            ignoreErrors: false         // disable throwing uncaughtException if an error event is emitted and it has no listeners
        })

        // Generate a runtime uuid
        this.#id = options?.id || uuid12()

        if (url) this.#url = url
        debug(`Initializing context with url "${this.#url}"`)

        // Initialize indexes
        this.#layerIndex = new LayerIndex(path.join(user.home, 'layerIndex.json'))
        this.#treeIndex = new TreeIndex(path.join(user.home, 'treeIndex.json'))
        this.#tree = new Tree(this.#layerIndex, this.#treeIndex)

        // Initialize event listeners
        this.#initializeTreeEventListeners()

        // Sets the context url
        this.set(this.#url, CONTEXT_AUTOCREATE_LAYERS)
        debug(`Context with url "${this.#url}", runtime id: "${this.id}" initialized`)

    }


    /**
     * Getters
     */

    get id() { return this.#id }
    get url() { return this.#url }
    get path() { return this.#path }
    get array() { return this.#array }
    get tree() { return this.#tree.getJsonTree(); }

    get contextArray() { return this.#contextArray; }
    get featureArray() { return this.#featureArray; }
    get filterArray() { return this.#filterArray; }

    get userDataHome() { return user.home; }


    /**
     * Context management
     */

    set url(url) { return this.set(url); }

    set(url = CONTEXT_URL_BASE, autoCreateLayers = CONTEXT_AUTOCREATE_LAYERS) {

        if (!url || typeof url !== 'string') throw new Error(`Context url must be of type string, "${typeof url}" given`)

        let parsed = new Url(url)
        if (this.#url === parsed.url) return this.#url

        debug(`Setting context to "${parsed.url}"`)
        console.log(this.#tree)
        this.#tree.insert(parsed.path)
        this.#initializeLayers(parsed.array)

        // Update context variables
        this.#url = parsed.url
        this.#path = parsed.path
        this.#array = parsed.array

        this.emit('url', this.#url)
        return this.#url

    }


    /**
     * Layer management
     */

    hasLayer(name) {
        return this.#layerIndex.hasLayerName(name)
    }

    getLayer(name) {
        return this.#layerIndex.getLayerByName(name)
    }

    addLayer(layer) {
        return this.#layerIndex.addLayer(layer)
    }

    createLayer(name, options) {
        options = {
            name: name,
            ...options
        }

        let layer = new Layer(options)
        this.#layerIndex.addLayer(layer)
    }

    // TODO: Not tested yet!
    updateLayer(name, options) {
        return this.#layerIndex.updateLayer(name, options)
    }

    renameLayer(name, newName) {
        return this.#layerIndex.renameLayer(name, newName)
    }

    deleteLayer(name) {
        return this.#layerIndex.removeLayerByName(name)
    }

    // TODO: Not implemented
    destroyLayer(name) {
        return false
    }

    listLayers() {
        return this.#layerIndex.list()
    }


    /**
     * Context tree management
     */

    insertPath(path, autoCreateLayers = CONTEXT_AUTOCREATE_LAYERS) {
        if (!path || typeof path !== 'string') throw new Error('Context url must be of type string')
        let parsed = new Url(path)
        this.#tree.insert(parsed.path, autoCreateLayers)
    }

    removePath(path) {
        this.#tree.remove(path)
    }

    movePath(path, newPath, recursive) {
        this.#tree.move(path, newPath, recursive)
    }

    copyPath(path, newPath, recursive) {
        this.#tree.copy(path, newPath, recursive)
    }

    saveContextTree() {
        this.#tree.save()
    }

    updateContextTreeFromJson(json) {
        this.#tree.load(json)
    }

    /**
     * Misc
     */

    getEventListeners() { return this.eventNames(); }

    stats() {
        return {
            id: this.#id,
            url: this.#url,
            path: this.#path,
            array: this.#array,
            contextArrayLength: this.#contextArray.length,
            featureArrayLength: this.#featureArray.length,
            filterArrayLength: this.#filterArray.length,
        }
    }


    /**
     * Internal methods
     */

    #initializeTreeEventListeners() {
        this.#tree.on('update', (tree) => {
            this.emit('context:tree:update', tree)
        })

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

    #initializeLayers(layerArray = [], autoCreateLayers = CONTEXT_AUTOCREATE_LAYERS) {

        let ctxArr = []
        let ftArr = []
        let filArr = []

        layerArray.forEach((layerName) => {
            let initialized  = (!this.#layerIndex.hasLayerName(layerName) && autoCreateLayers) ?
                    this.createLayer(layerName) :
                    this.#layerIndex.getLayerByName(layerName)

            if (!initialized) {
                debug(`Layer "${layerName}" not found and autoCreateLayers is set to false, skipping initialization`)
                return // TODO: FIXME
            }

            ctxArr.push(...initialized.contextBitmaps)
            ftArr.push(...initialized.featureBitmaps)
            filArr.push(...initialized.filterBitmaps)
        })

        this.#initializeContextBitmaps(ctxArr)
        this.#initializeFeatureBitmaps(ftArr)
        this.#initializeFilterBitmaps(filArr)

    }

    #initializeContextBitmaps(arr) {
        // Clear local context map
        this.#contextArray.length = 0
        arr.forEach(uuid => {
            debug(`Adding context bitmap UUID "${uuid}" to contextArray`)
            this.#contextArray.push(uuid)
        })
    }

    #initializeFeatureBitmaps(arr) {
        // Clear local feature map
        this.#featureArray.length = 0
        arr.forEach(uuid => {
            debug(`Adding feature bitmap UUID "${uuid}" to context featureArray`)
            this.#featureArray.push(uuid)
        })
    }

    #initializeFilterBitmaps(arr) {
        // Clear local filter map
        this.#filterArray.length = 0
        arr.forEach(uuid => {
            debug(`Adding filter bitmap UUID "${uuid}" to context filterArray`)
            this.#filterArray.push(uuid)
        })

    }

    #parseContextArray(arr) {
        let parsed = arr.flatMap(element => {
            return (element.includes('/')) ? element.split('/') : element
        });

        return parsed.filter((x, i, a) => a.indexOf(x) === i)
        // return [... new Set(parsed)]
    }

}

module.exports = Context
