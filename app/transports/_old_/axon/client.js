'use strict'


const axon = require('pm2-axon')
const req = axon.socket('req')
const sub = axon.socket('sub')

const utils = require('../../lib/utils')
const EventEmitter = require('eventemitter2')


class Client extends EventEmitter {

    constructor(opts = {}) {
        super()

        this.req = req.connect(3000)
        console.log('ReqRep client initialized')

        this.sub = sub.connect('unix:///tmp/canvas-pubsub.sock')
        console.log('PubSub client initialized')

        this.setupEventProxy()
        console.log('Event proxy initialized')

    }

    setupEventProxy() {
        this.sub.on('message', (action, data, socket) => this.emit(action, data))
    }

    setUrl(url, cb = null) {
        this.req.send('setUrl', url, (res) => {
            return (cb) ? cb(res) : true
        })
    }

    getUrl(cb) { this.req.send('getUrl', null, (url) => cb(url)) }

    getDevice(cb) { this.req.send('getDevice', null, (device) => cb(device)) }

    disconnect() {
        this.req.close()
        this.sub.close()
        process.removeAllListeners()
        //this.req.end()
        //this.req.unref()
    }

}

module.exports = Client
