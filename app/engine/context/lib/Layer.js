'use strict'


// Utils
const { uuid12 } = require('./utils')

const LAYER_TYPES = [
    'universe',     // TODO
    'workspace',    // Collection of canvases, has additional parameters (color, description)
    'canvas',       // Can store context, feature and filter bitmaps + dashboard / UI layouts
    'context',      // Has context bitmaps only
    'filter',       // Represents a single filter bitmap
    'label'         // Label only (no bitmaps)
]

class Layer {

    constructor(options) {

        if (typeof options !== 'object') {
            options = { name: options };
        }

        // Default options
        options = {
            schemaVersion: '2.0',
            autoCreateBitmaps: true,
            id: uuid12(),
            type: 'context',
            color: null,
            ...options
        }

        if (!options.name) throw new Error('Layer name is a mandatory parameter')

        // TODO: This constructor needs a propper cleanup!
        this.schemaVersion = options.schemaVersion
        this.id =  options.id
        this.type = this.#validateType(options.type)
        this.name = this.#sanitizeName(options.name)
        this.label = (options.label) ? this.#sanitizeLabel(options.label) : this.name
        this.description = options?.description || ''
        this.color = options?.color || 'auto'

        if (options.contextBitmaps) {
            this.contextBitmaps = options.contextBitmaps
        } else {
            this.contextBitmaps = (options.autoCreateBitmaps) ? [ this.id ] : []
        }

        this.featureBitmaps = []
        this.filterBitmaps = []

        this.metadata = options.metadata || {} // TODO: Handle object lifetime metadata

    }


    /**
     * Getters
     */

    //get name() { return this.#name; }
    //get type() { return this.#type; }
    //get id() { return this.#id; }

    get contextBitmapArray() {
        return this.contextBitmaps
    }

    get featureBitmapArray() {
        return this.featureBitmaps
    }

    get filterBitmapArray() {
        return this.filterBitmaps
    }

    /**
     * Setters
     */


    /**
     * Validators
     */

    #validateType(type) {
        if (! LAYER_TYPES.includes(type)) {
            throw new Error('Unsupported layer type')
        }

        return type
    }

    #sanitizeName(name) {
        if (!name || typeof name !== 'string' || !name.trim().length) {
            throw new Error(`Layer name must be a non-empty String, "${typeof name}" given`)
        }

        return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    }

    #sanitizeLabel(label) {
        if(!label || typeof label !== 'string' || !label.trim().length) {
            throw new Error('Layer label must be a non-empty String')
        }

        return label.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    }

    toJSON() {
        // TODO: Maybe we should use JSON.stringify to return a valid JSON directly
        return {
            schemaVersion: this.schemaVersion,
            id: this.id,
            type: this.type,
            name: this.name,
            label: this.label,
            description: this.description,
            color: this.color,
            contextBitmaps: this.contextBitmaps,
            featureBitmaps: this.featureBitmaps,
            filterBitmaps: this.filterBitmaps,
            metadata: this.metadata
        }
    }

    static fromJSON(json) {
        // TODO: Maybe we should use JSON string as input and then JSON.parse it
        const layer = new Layer({
            schemaVersion: json.schemaVersion,
            id: json.id,
            type: json.type,
            name: json.name,
            label: json.label,
            description: json.description,
            color: json.color,
            contextBitmaps:json.contextBitmaps,
            featureBitmaps: json.featureBitmaps,
            filterBitmaps: json.filterBitmaps,
            metadata: json.metadata
        })
        return layer;
    }

}

module.exports = Layer
