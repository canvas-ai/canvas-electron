'use strict'


/**
 * canvas.ContextD Client interface
 */


const zeromq = require('zeromq')
const zrep = zeromq.socket("rep")
const zpub = zeromq.socket("pub")

const {
    msgPack,
    msgUnpack,
    uuid12,
    xpipe
} = require('../../lib/utils')

const Context = require('../../lib/context')
const debug = require('debug')('transport.zeromq.server')


class Server extends Context {

    constructor(opts = {}) {
        super()

        this.rep = zrep.bind("tcp://127.0.0.1:3000")
        console.log('ReqRep server initialized')

        this.pub = zpub.bindSync("tcp://127.0.0.1:4000");
        console.log('PubSub server initialized')

        this.setupEventProxy()
        console.log('Event proxy initialized')

        this.setupRequestListener()
        console.log('Request proxy initialized')
    }

    setupEventProxy() {
        this.on('url', (data) => {
            console.log('Sending URL event to clients')
            this.pub.send('url', data)
        })

        this.on('change', (data) => {
            console.log('Sending change event to clients')
            this.pub.send('change', data)
        })
    }

    setupRequestListener() {
        zrep.on('message', (data) => {//(action, data, reply) => {

            let req = msgUnpack(data)
            // TODO: Input validation
            console.log(req)

            switch (req.action) {
                case 'getUrl':
                    this.emit('getUrl', req.data)
                    break
                case 'setUrl':
                    console.log('setUrl')
                    this.emit(this.setUrl(req.data))
                    break
                default:
                    console.log(`Invalid request type: ${req.action}`)
                    return false
            }
        })
    }

}

module.exports = Server
