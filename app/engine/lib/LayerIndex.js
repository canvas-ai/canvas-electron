'use strict'


const debug = require('debug')('context-layer-index')
const JsonMap = require('../../utils/JsonMap')
const Layer = require('./Layer')

class LayerIndex {

    // TODO: Use a more sensible fallback location
    constructor(userDataPath) {
        this.index = new JsonMap(userDataPath)
        this.nameToLayerMap = new Map()
        this.#initNameToLayerMap()
    }

    // TODO: Update layer method, on that occasion
    // #1 Remove 2 json maps, use only one + index
    // #2 Integrate into #Tree
    // #3 Eval integration with the main db backend
    has(id) { return this.hasLayerID(id); }
    hasLayerID(id) { return this.index.has(id); }
    hasLayerName(name) { return this.nameToLayerMap.has(name); }

    list() {
        let result = []
        for (const [id, layer] of this.index.entries()) {
            result.push(layer)
        }

        return result
    }

    createLayer(name, options = {}) {

        // TODO: Refactor
        if (typeof name === 'string') {
            options = {
                name: name,
                ...options
            }
        } else { options = name }

        if (this.hasLayerName(options.name)) return false

        let layer = new Layer(options)
        this.addLayer(layer)

        return layer
    }

    addLayer(layer) {
        this.index.set(layer.id, layer);
        this.nameToLayerMap.set(layer.name, layer);
    }

    getLayerByID(id) {
        return this.index.get(id) || null;
    }

    getLayerByName(name) {
        let res = this.nameToLayerMap.get(name);
        return res || null
    }

    updateLayer(name, options) {
        let layer = this.getLayerByName(name)
        if (!layer) return false
        Object.assign(layer, options)
        this.index.set(layer.id, layer)
        return true
    }

    renameLayer(name, newName) {
        const layer = this.getLayerByName(name);
        if (layer) {
            layer.name = newName;
            this.nameToLayerMap.delete(name);
            this.nameToLayerMap.set(newName, layer);
            this.index.set(layer.id, layer);
        }
    }

    removeLayer(layer) {
        this.index.delete(layer.id);
        this.nameToLayerMap.delete(layer.name);
    }

    removeLayerByID(id) {
        const layer = this.getLayerByID(id);
        if (layer) return this.removeLayer(layer)
    }

    removeLayerByName(name) {
        const layer = this.getLayerByName(name);
        if (layer) return this.removeLayer(layer)
    }

    nameToID(name) {
        const layer = this.getLayerByName(name);
        return layer.id
    }

    idToName(id) {
        const layer = this.getLayerByID(id);
        return layer.name
    }

    #initNameToLayerMap() {
        for (const [id, layer] of this.index.entries()) {
            this.nameToLayerMap.set(layer.name, this.index.get(layer.id))
        }
    }

}


module.exports = LayerIndex
