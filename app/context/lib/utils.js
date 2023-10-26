'use strict'


// Includes
const debug = require('debug')('canvas-context')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { ensureDirSync } = require('fs-extra')

/*
 * Temporary logger as per @RFC5424
 *    error: 0
 *    warn: 1
 *    info: 2
 *    verbose: 3
 *    debug: 4
 *    silly: 5
 * Logger needs to implement at least the 4 methods below
*/
// TODO: Replace logger with canvas-utils-logger
const logger = {}
logger.debug = debug
logger.info = console.log
logger.warn = console.log
logger.error = console.error

class ResponseObject {

    constructor(opts = {}) {
        this.type = opts.type || "response"
        this.message = opts.message || null
        this.data = opts.data || null
    }

}

function ensureContextDirectory(dir) {

    if (dir.startsWith('~/') || dir === '~') {
        dir = dir.replace('~', os.homedir())
    }

    dir = path.resolve(dir)
    ensureDirSync(dir)

    return dir

}

function getDefaultContextDirectory() {
    return path.join(os.homedir(), ".canvas")
}

function uuid(delimiter = true) {
  return (delimiter) ?
      ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16)) :
      ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16));
}

function uuid12(delimiter = true) {
  return (delimiter) ?
      ([1e3]+-1e3+-1e3).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16)) :
      ([1e3]+1e3+1e3).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16));
}

const arrayToTree = (arr, p = "parent_id") => arr.reduce((o, n) => {

    if (!o[n.id]) o[n.id] = {};
    if (!o[n[p]]) o[n[p]] = {};
    if (!o[n[p]].children) o[n[p]].children= [];
    if (o[n.id].children) n.children= o[n.id].children;

    o[n[p]].children.push(n);
    o[n.id] = n;

    return o;

}, {})

function pathsToTree(paths) {
    let result = [];
    let level = {result};

    paths.forEach(path => {
      path.replace(/^universe\:\/\//, '').split('/').reduce((r, name, i, a) => {
        if(!r[name]) {
          r[name] = {result: []};
          r.result.push({name, children: r[name].result})
        }

        return r[name];
      }, level)
    })

    return result
}

function pathsToTree2(paths) {
  // create a map to store the tree structure
  const tree = {};

  // loop through the paths
  for (const path of paths) {
    // split the path into its components
    const components = path.split('/').filter(Boolean);

    // create a reference to the current level of the tree
    let currentLevel = tree;

    // loop through the components of the path
    for (const component of components) {
      // if the component doesn't exist in the current level, create it
      if (!currentLevel[component]) {
        currentLevel[component] = {};
      }

      // update the current level to the component
      currentLevel = currentLevel[component];
    }
  }

  //console.log(JSON.stringify(tree, null, 2))

  return tree;
}

function printTree(tree, indent = 0) {
    // loop through the keys at the current level of the tree
    for (const key of Object.keys(tree)) {
      // print the key with the correct indentation
      console.log(' '.repeat(indent) + "/" + key);

      // if the key has children, print them recursively
      if (Object.keys(tree[key]).length > 0) {
        printTree(tree[key], indent + 2);
      }
    }
  }

module.exports = {
    logger,
    getDefaultContextDirectory,
    ensureContextDirectory,
    uuid,
    uuid12,
    arrayToTree,
    pathsToTree,
    pathsToTree2,
    printTree,
}
