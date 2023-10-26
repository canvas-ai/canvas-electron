'use strict'


const path = require('path')
//const Conf = require('conf')
const JsonMap = require('../../utils/JsonMap')
const Layer = require('./Layer')

class LayerIndex  { //extends Conf {

    constructor(filePath) {
        if (!filePath) throw new Error('filePath is required')
        this.index = new JsonMap(filePath)
        this.nameToLayerMap = new Map()
        this.#initNameToLayerMap()
    }

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
        return layer ? this.removeLayer(layer) : false
    }

    removeLayerByID(id) {
        const layer = this.getLayerByID(id);
        return layer ? this.removeLayer(layer) : false
    }

    removeLayerByName(name) {
        const layer = this.getLayerByName(name);
        return layer ? this.removeLayer(layer) : false
    }

    nameToID(name) {
        const layer = this.getLayerByName(name);
        return layer.id || null
    }

    idToName(id) {
        const layer = this.getLayerByID(id);
        return layer.name || null
    }

    #initNameToLayerMap() {
        for (const [id, layer] of this.index.entries()) {
            this.nameToLayerMap.set(layer.name, this.index.get(layer.id))
        }
    }

}


module.exports = LayerIndex
