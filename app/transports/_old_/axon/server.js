'use strict'


const axon = require('pm2-axon')
const rep = axon.socket('rep')
const pub = axon.socket('pub')

const utils = require('../../lib/utils')
const Context = require('../../lib/context')


class Server extends Context {

    constructor(opts = {}) {
        super()

        this.rep = rep.bind(3000)
        console.log('ReqRep server initialized')

        this.pub = pub.bind('unix:///tmp/canvas-pubsub.sock')
        console.log('PubSub server initialized')

        this.setupEventProxy()
        console.log('Event proxy initialized')

        this.setupRequestListener()
        console.log('Request proxy initialized')
    }

    setupEventProxy() { this.onAny((event, data) => this.pub.send(event, data)) }

    setupRequestListener() {
        this.rep.on('message', (action, data, reply) => {

            if (typeof this[action] === 'function') {
                (data) ? reply(this[action](data)) : reply(this[action]())
            }

            reply(null)

        })

    }

}

module.exports = Server
