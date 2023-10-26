'use strict'


/**
 * canvas.ContextD Server interface
 */


const zeromq = require('zeromq')
const zreq = zeromq.socket("req")
const zsub = zeromq.socket("sub")

const {
    msgPack,
    msgUnpack,
    uuid12,
    xpipe
} = require('../../lib/utils')

const EventEmitter = require('eventemitter2')
const debug = require('debug')('transport.zeromq.client')


class Client extends EventEmitter {

    constructor(opts = {}) {
        super()

        this.req = zreq.connect("tcp://127.0.0.1:3000")
        console.log('ReqRep client initialized')

        this.sub = zsub.connect("tcp://127.0.0.1:4000")
        console.log('PubSub client initialized')

        this.setupEventListener()
        console.log('Event proxy initialized')
    }

    setupEventListener() {

        this.sub.on('message', (action, data = null, socket) => {
            console.log('Got a msg')
            switch (action) {
                case 'url':
                    this.emit('url', data)
                    break
                case 'change':
                    this.emit('change', data)
                    break
                default:
                    console.log(`Invalid event type: ${action}`)
            }
        });

    }

    setUrl(url, cb) {
        var msg = {
            action: 'setUrl',
            data: url
        }

        this.req.send(msgPack(msg), (reply) => {
            console.log('Got reply on setUrl')
            console.log(reply)
            cb(reply)
        })
    }

    getUrl(cb) {
        var msg = {
            action: 'geetUrl'
        }
        this.req.send('getUrl', null, (url) => cb(url))
    }

    disconnect() {
        this.req.close()
        this.sub.close()
        //process.removeAllListeners()
        //this.req.end()
        //this.req.unref()
    }

}

module.exports = Client
