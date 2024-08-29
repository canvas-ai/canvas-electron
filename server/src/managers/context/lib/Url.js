'use strict';


// Includes
const { urlToHttpOptions } = require('node:url');
const internalLayers = require('./layers/builtin');

// Constants
const DEFAULT_URL_PROTOCOL = 'universe:';    // TODO: Move to some sane location
const DEFAULT_URL_PATH = '/';


class Url {

    constructor(url, baseUrl = null, protocol = DEFAULT_URL_PROTOCOL) {
        this._baseUrl = baseUrl;
        this._protocol = protocol;
        this.setUrl(url);
    }

    validate(url) { return Url.validate(url); }

    static validate(url) {
        if (typeof url !== 'string') {
            throw new Error(`Context path needs to be of type string, got "${typeof url}"`);
        }

        if (/[`$%^*;'",<>{}[\]\\]/gi.test(url)) {
            throw new Error(`Context path cannot contain special characters, got "${url}"`);
        }

        return true;
    }


    setUrl(url = DEFAULT_URL_PATH) {
        if (typeof url !== 'string') {throw new Error('Context path needs to be of type string');}

        // Get the URL path
        this._path = this.getPath(url);

        // Get the URL protocol
        this._protocol = this.getProtocol(url);

        // Construct the URL href
        this._string = this._protocol + '//' + this._path;

        // Get the URL array
        this._array = this.getArrayFromString(this._string);

        return this._path;
    }

    get url() { return this._string; }
    get string() { return this._string; }
    get path() { return this._path; }
    get array() { return this._array; }
    get protocol() { return this._protocol; }

    static parse(url) {
        // Get the URL path
        let path = Url.getPath(url);

        // Get the URL protocol
        let protocol = Url.getProtocol(url);

        // Construct the URL href
        return protocol + '/' + path;
    }

    getProtocol(url) { return Url.getProtocol(url); }

    static getProtocol(url) {
        // If no protocol is specified, return the default
        if (!url.includes(':')) {return DEFAULT_URL_PROTOCOL;}

        // Split out the protocol string
        let proto = url.split(':');

        // Fallback to DEFAULT_URL_PROTOCOL
        return (proto && proto.length > 0) ? proto[0] + ':' : DEFAULT_URL_PROTOCOL;
    }

    getPath(url) { return Url.getPath(url);  }

    static getPath(url) {
        let sanitized = url.toLowerCase();

        // Ensure the URL starts correctly with base URL if needed
        if (!sanitized.startsWith(DEFAULT_URL_PROTOCOL) && !sanitized.startsWith('/') && this._baseUrl) {
            sanitized = this._baseUrl + '/' + sanitized;
        }

        sanitized = sanitized
            .replace(/\\/g, '/') // Standardize on forward slashes
            .replace(/^[^:]+:/, '') // Remove the protocol
            .replace(/\/+/g, '/') // Reduce multiple slashes to a single slash
            .replace(/ +/g, '_') // Replace spaces with underscores
            .replace(/[`$%^*;'",<>{}[\]\\]/gi, ''); // Remove special characters

        sanitized = sanitized.split('/')
            .map(part => {
                // Remove leading dot unless it's a recognized internal layer
                if (part.startsWith('.')) {
                    return internalLayers.some(layer => layer.name === part) ? part : part.substring(1);
                }
                return part.trim();
            })
            .filter(part => part.length > 0)
            .join('/');

        if (!sanitized.startsWith('/')) {sanitized = '/' + sanitized;}
        return sanitized || DEFAULT_URL_PATH;
    }

    getArrayFromString(url) { return Url.getArrayFromString(url); }

    static getArrayFromString(url) {
        let parsed = urlToHttpOptions(new URL(url));
        if (!parsed) {throw new Error(`Invalid URL: ${url}`);}

        let context = [
            parsed.hostname,
            ...parsed.pathname.split('/'),
        ];

        // TODO: Rework, as this is ugly
        // TODO: Return [ DEFAULT_URL_PATH ] instead?
        return context.filter(v => v.length > 0);
    }

}

module.exports = Url;
