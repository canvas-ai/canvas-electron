'use strict';


// Utils
const EventEmitter = require('eventemitter2');
const debug = require('debug')('canvas:context:tree');
const path = require('path');
const os = require('os');

// App modules
const LayerIndex = require('./LayerIndex');
const TreeIndex = require('./TreeIndex');
const TreeNode = require('./TreeNode');


/**
 * Tree class
 * @extends EventEmitter
 */

class Tree extends EventEmitter {

    constructor(options = {
        // TODO: Refactor!
        treePath: path.join(os.homedir(), '.canvas', 'tree.json'),
        layerPath: path.join(os.homedir(), '.canvas', 'layers.json'),
    }) {

        // Initialize event emitter
        super();

        // Initialize indexes
        this.dbtree = new TreeIndex(options.treePath);
        this.dblayers = new LayerIndex(options.layerPath);

        this.showHidden = false;

        // Initialize the root node
        debug('Initializing context tree');
        this.rootLayer = this.dblayers.getLayerByName('/');
        if (!this.rootLayer) {
            throw new Error('Root layer not found in the layer index');
        }

        this.root = new TreeNode(this.rootLayer.id, this.rootLayer);
        debug(`Root node created with layer ID "${this.rootLayer.id}", name "${this.rootLayer.name}" of type "${this.rootLayer.type}"`);

        // Load tree from the database
        if (this.load()) {
            debug('Context tree loaded from database');
        } else {
            debug('Context tree not found in database, using vanilla root node');
        }

        // Emit the ready event
        debug('Context tree initialized');
        debug(JSON.stringify(this.#buildJsonTree(), null, 2));

        this.emit('ready');

    }

    /**
     * Getters
     */

    get paths() { return this.#buildPathArray(); }
    get layers() { return this.dblayers; }


    /**
     * Tree interface methods
     */

    pathExists(path) {
        return this.getNode(path) ? true : false;
    }

    insert(path = '/', node, autoCreateLayers = true) {
        debug(`Inserting path "${path}" to the context tree`);
        if (path === '/' && !node) { return true; }

        let currentNode = this.root;
        let child;

        const layerNames = path.split('/').filter(Boolean);
        for (const layerName of layerNames) {
            let layer = this.dblayers.getLayerByName(layerName);
            if (this.dblayers.isInternalLayerName(layerName)) {
                //debug(`Layer "${layerName}" is internal and can not be used in the tree`)
                throw new Error(`Layer "${layerName}" is internal and can not be used in the tree`);
                //return false
            }

            if (!layer) {
                if (autoCreateLayers) {
                    layer = this.dblayers.createLayer(layerName);
                } else {
                    debug(`Layer "${layerName}" not found at path "${path} and autoCreateLayers is disabled"`);
                    return false;
                }
            }

            child = currentNode.getChild(layer.id);
            if (!child) {
                child = new TreeNode(layer.id, this.dblayers.getLayerByID(layer.id));
                currentNode.addChild(child);
            }

            currentNode = child;
        }

        if (node) {
            // Check if node already exists
            child = currentNode.getChild(node.id);
            if (child && (child instanceof TreeNode)) {
                // Add node to parent
                currentNode.addChild(child);
            }
        }

        // Commit changes
        this.save();
        debug(`Path "${path}" inserted successfully.`);
        return true;

    }

    move(pathFrom, pathTo, recursive = false) {
        if (recursive) {return this.moveRecursive(pathFrom, pathTo);}
        debug(`Moving layer from "${pathFrom}" to "${pathTo}"`);

        const node = this.getNode(pathFrom);
        if (!node) {
            debug('Unable to move layer, source node not found');
            return false;
        }

        const parentPath = pathFrom.split('/').slice(0, -1).join('/');
        const parentNode = this.getNode(parentPath);
        if (!parentNode) { return false; }

        let layer = node.payload;
        let targetNode = new TreeNode(layer.id, layer);

        if (!this.insert(pathTo, targetNode)) {
            console.log(`Unable to move layer "${layer.name}" to path "${pathTo}"`);
            return false;
        }

        // Remove existing node from parent
        parentNode.removeChild(node.id);

        // Move all node children to parent
        if (node.hasChildren) {
            for (const [key, value] of node.children.values()) {
                //parentNode.children.set(key, value);
                parentNode.addChild(value);
            }
        }

        // Commit changes
        this.save();

    }

    moveRecursive(pathFrom, pathTo) {
        debug(`Moving layer from "${pathFrom}" to "${pathTo}" recursively`);
        const node = this.getNode(pathFrom);
        const parentPath = pathFrom.split('/').slice(0, -1).join('/');
        const parentNode = this.getNode(parentPath);
        const layer = node.payload;

        if (pathTo.includes(layer.name)) {
            throw new Error(`Destination path "${pathTo}" includes "${layer.name}"`);
        }

        if (!this.insert(pathTo, node)) {
            console.log(`Unable to move layer "${layer.name}" into path "${pathTo}"`);
            return false;
        }

        // Remove existing node from parent
        parentNode.removeChild(node.id);

        // Commit changes
        this.save();

    }

    copy(pathFrom, pathTo, recursive) {

        // Commit changes
        this.save();
    }

    copyRecursive(pathFrom, pathTo) {

        // Commit changes
        this.save();
    }

    remove(path, recursive = false) {
        const node = this.getNode(path);
        if (!node) {
            debug(`Unable to remove layer, source node not found at path "${path}"`);
            return false;
        }

        const parentPath = path.split('/').slice(0, -1).join('/');
        const parentNode = this.getNode(parentPath);
        if (!parentNode) {throw new Error(`Unable to remove layer, parent node not found at path "${parentPath}"`);}

        if (!recursive && node.hasChildren) {
            // Merge all node children to parent
            for (const [key, value] of node.children.values()) {
                parentNode.addChild(value);
            }
        }

        // Remove existing node from parent
        parentNode.removeChild(node.id);

        // Commit changes
        this.save();
        return true;
    }

    renameLayer(name, newName) {
        return this.dblayers.renameLayer(name, newName);
    }

    // Store tree as JSON to the database (sync!)
    save() {
        debug('Saving in-memory tree to database');
        let data = this.#buildJsonIndexTree();
        try {
            this.dbtree.set('tree', data);
            debug('Tree saved successfully.');
        } catch (error) {
            debug(`Error saving tree to database: ${error.message}`);
            throw error; // or handle it as needed
        }
    }

    // Load JSON tree from the database
    load() {
        debug('Loading JSON Tree from database...');
        const json = this.dbtree.get('tree');
        if (!json) {
            debug('No persistent JSON data found');
            return false;
            //throw new Error('No JSON data supplied')
        }

        this.root = this.#buildTreeFromJson(json);
        return true;
    }


    /**
     * Legacy methods
     */

    fromJSON(json) { return this.load(json); }
    toJSON() { return this.#buildJsonTree(); }
    getJsonIndexTree() { return this.#buildJsonIndexTree(); }
    getJsonTree() { return this.#buildJsonTree(); }
    loadJsonTree(json) { return this.#buildTreeFromJson(json); }
    clear() {
        debug('Clearing context tree');
        this.root = new TreeNode(this.rootLayer.id, this.rootLayer);
        this.save();
    }


    /**
     * Tree node methods
     */

    getNode(path) {
        if (path === '/' || !path) {return this.root;}
        const layerNames = path.split('/').filter(Boolean);
        let currentNode = this.root;

        for (const layerName of layerNames) {
            let layer = this.dblayers.getLayerByName(layerName);
            if (!layer) {
                debug(`Layer "${layerName}" not found in index`);
                return false;
            }

            let child = currentNode.getChild(layer.id);
            if (!child) {
                debug(`Target path "${path}" does not exist`);
                return false;
            }

            currentNode = child;
        }

        return currentNode;
    }

    insertNode(path, node) {
        const targetNode = this.getNode(path);
        if (!targetNode) {
            debug(`Unable to insert node at path "${path}", target node not found`);
            return false;
        }

        if (!node || !(node instanceof TreeNode)) {
            debug('Unable to move layer, source node not found');
            return false;
        }

        // Check if node already exists
        if (!targetNode.hasChild(node.id)) {
            targetNode.addChild(node);
        }

        //this.emit('insert', path, node)
        this.save();
        return true;

    }

    removeNode(path, recursive = false) {
        const node = this.getNode(path);
        if (!node) {
            debug(`Unable to remove layer, source node not found at path "${path}"`);
            return false;
        }

        const parentPath = path.split('/').slice(0, -1).join('/');
        const parentNode = this.getNode(parentPath);
        if (!parentNode) {throw new Error(`Unable to remove layer, parent node not found at path "${parentPath}"`);}

        if (!recursive && node.hasChildren) {
            // Merge all node children to parent
            for (const [key, value] of node.children.values()) {
                parentNode.addChild(value);
            }
        }

        // Remove existing node from parent
        parentNode.removeChild(node.id);

        // Commit changes
        this.save();
        return true;
    }

    moveNode(pathFrom, pathTo, recursive = false) { }

    moveNodeRecursive(pathFrom, pathTo) { }


    /**
     * Internal methods
     */

    #buildTreeFromJson(rootNode = this.root, autoCreateLayers = true) {
        // Create a root node if none is provided
        const buildTree = (nodeData) => {
            let node;
            let layer;

            layer = this.dblayers.getLayerByID(nodeData.id);
            if ((!layer && !nodeData.name) || (!layer && !autoCreateLayers)) {
                throw new Error(`Unable to find layer by ID "${nodeData.id}", can not create a tree node`);
            }

            if (!layer && autoCreateLayers) {
                console.log('Not here');
                layer = this.dblayers.createLayer(nodeData.name);
            }

            node = new TreeNode(layer.id, this.dblayers.getLayerByID(layer.id));
            for (const childData of nodeData.children) {
                const childNode = buildTree(childData);
                node.addChild(childNode);
            }

            return node;
        };

        return buildTree(rootNode);
    }

    #buildJsonIndexTree(node = this.root) {
        const buildTree = (currentNode) => {
            const children = Array.from(currentNode.children.values())
                .filter(child => child instanceof TreeNode)
                .map(child => child.hasChildren ? buildTree(child) : {
                    id: child.id,
                    children: [],
                });

            return {
                id: currentNode.id,
                children: children,
            };
        };

        return buildTree(node);
    }

    #buildJsonTree(node = this.root) {
        const buildTree = (currentNode) => {
            const children = Array.from(currentNode.children.values())
                .filter(child => child instanceof TreeNode)
                .map(child => child.hasChildren ? buildTree(child) : createLayerInfo(child.payload));

            return createLayerInfo(this.dblayers.getLayerByID(currentNode.id) || this.rootLayer, children);
        };

        const createLayerInfo = (payload, children = []) => ({
            id: payload.id,
            type: payload.type,
            name: payload.name,
            label: payload.label,
            description: payload.description,
            color: payload.color,
            locked: payload.locked,
            children,
        });

        return buildTree(node);
    }

    #buildPathArray(sort = true) {
        const paths = [];
        const traverseTree = (node, parentPath) => {
            const path = (!parentPath || parentPath === '') ? '/' : `${parentPath}/${node.name}`;
            if (node.children.size > 0) {
                for (const child of node.children.values()) {
                    traverseTree(child, path);
                }
            } else {
                paths.push(path.replace(/\/\//g, '/')); // TODO: Fix this
            }
        };
        traverseTree(this.root);
        return sort ? paths.sort() : paths;
    }

}

module.exports = Tree;
