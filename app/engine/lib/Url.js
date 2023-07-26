'use strict'


// Includes
const { urlToHttpOptions } = require('node:url')

// Constants
const DEFAULT_URL_PROTOCOL = 'universe:'
const DEFAULT_URL_PATH = '/'


class Url {

    constructor(url, protocol = DEFAULT_URL_PROTOCOL) {
        this._protocol = protocol;
        this.setUrl(url)
    }

    set url(url) { this.setUrl(url); }
    setUrl(url = DEFAULT_URL_PATH) {

        if (typeof url !== 'string') throw new Error('Context path needs to be of type string')

        // Get the URL path
        this._path = this.getPath(url)

        // Get the URL protocol
        this._protocol = this.getProtocol(url)

        // Construct the URL href
        this._string = this._protocol + '//' + this._path

        // Get the URL array
        this._array = this.getArrayFromString(this._string)

        return this._path
    }

    get url() { return this._string }
    get string() { return this._string }
    get path() { return this._path }
    get array() { return this._array }
    get protocol() { return this._protocol }

    static parse(url) {

        // Get the URL path
        let path = Url.getPath(url)

        // Get the URL protocol
        let protocol = Url.getProtocol(url)

        // Construct the URL href
        return protocol + '/' + path


    }

    getProtocol(url) {
        // If no protocol is specified, return the default
        if (!url.includes(':')) return DEFAULT_URL_PROTOCOL

        // Split out the protocol string
        let proto = url.split(':')

        // Fallback to DEFAULT_URL_PROTOCOL
        return (proto && proto.length > 0) ? proto[0] + ':' : DEFAULT_URL_PROTOCOL
    }

    static getProtocol(url) {
        // If no protocol is specified, return the default
        if (!url.includes(':')) return DEFAULT_URL_PROTOCOL

        // Split out the protocol string
        let proto = url.split(':')

        // Fallback to DEFAULT_URL_PROTOCOL
        return (proto && proto.length > 0) ? proto[0] + ':' : DEFAULT_URL_PROTOCOL
    }

    getPath(url) {
        let sanitized = url.toLowerCase();
        sanitized = sanitized
            .replace(/\\/g, '/') // replace backslash with slash
            .replace(/^[^:]+:/, '') // remove the protocol
            .replace(/\/{3,}/g, '//') // replace three or more consecutive slashes with two slashes
            .replace(/([^:])\/{2,}/g, "$1/") // replace two or more slashes with one, but not following a colon
            .replace(/ +/g, '_') // replace spaces with underscore
            .replace(/[`$:%^*;'",<>{}[\]\\]/gi, ''); // replace special characters

        sanitized = sanitized.split('/')
            .map(part => part.trim())
            .filter(part => part !== '_')
            .join("/");

        // Remove leading slash
        sanitized = sanitized.startsWith('/') ? sanitized.slice(1) : sanitized;

        // Fallback to DEFAULT_URL_PATH
        return sanitized || DEFAULT_URL_PATH;
    }

    static getPath(url) {
        let sanitized = url.toLowerCase();
        sanitized = sanitized
            .replace(/\\/g, '/') // replace backslash with slash
            .replace(/^[^:]+:/, '') // remove the protocol
            .replace(/\/{3,}/g, '//') // replace three or more consecutive slashes with two slashes
            .replace(/([^:])\/{2,}/g, "$1/") // replace two or more slashes with one, but not following a colon
            .replace(/ +/g, '_') // replace spaces with underscore
            .replace(/[`$:%^*;'",<>{}[\]\\]/gi, ''); // replace special characters

        sanitized = sanitized.split('/')
            .map(part => part.trim())
            .filter(part => part !== '_')
            .join("/");

        // Remove leading slash
        sanitized = sanitized.startsWith('/') ? sanitized.slice(1) : sanitized;

        // Fallback to DEFAULT_URL_PATH
        return sanitized || DEFAULT_URL_PATH;
    }

    getArrayFromString(url) {

        let parsed = urlToHttpOptions(new URL(url))
        if (!parsed) throw new Error(`Invalid URL: ${url}`)

        let context = [
            parsed.hostname,
            ...parsed.pathname.split('/')
        ]

        // TODO: Rework, as this is ugly
        // TODO: Return [ DEFAULT_URL_PATH ] instead?
        return context.filter(v => v.length > 0)

    }

    static getArrayFromString(url) {

        let parsed = urlToHttpOptions(new URL(url))
        if (!parsed) throw new Error(`Invalid URL: ${url}`)

        let context = [
            parsed.hostname,
            ...parsed.pathname.split('/')
        ]

        // TODO: Rework, as this is ugly
        // TODO: Return [ DEFAULT_URL_PATH ] instead?
        return context.filter(v => v.length > 0)

    }

}

module.exports = Url
