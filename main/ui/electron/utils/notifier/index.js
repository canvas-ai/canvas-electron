'use strict'

const {
  app,
  Notification
}               = require('electron')

const path      = require('path')
//const log       = app.utils.logger('ui.electron.notifier')

const ICO_GENERIC   = path.resolve(__dirname, '../assets/icons/ctxd_256x256.png')
const ICO_ERROR     = path.resolve(__dirname, '../assets/icons/ctxd_256x256.png')
const ICO_WARNING   = path.resolve(__dirname, '../assets/icons/ctxd_256x256.png')
const ICO_INFO      = path.resolve(__dirname, '../assets/icons/ctxd_256x256.png')
const ICO_DEBUG     = path.resolve(__dirname, '../assets/icons/ctxd_256x256.png')

class Notifier {

    constructor() {
        ////log.info('Notifier init()')
    }

    error(body, title = "Error", onShow = null, onClick = null, onRelpy = null) {

        if (!Notification.isSupported()) {
            //log.info('Notifications are not supported on this system')
            return false
        }

        let n = new Notification({
            title: title,
            body: body,
            silent: false,
            icon: ICO_ERROR,
        })

        n.show()
    }

    warning(body, title = "Warning", onShow = null, onClick = null, onRelpy = null) {

        if (!Notification.isSupported()) {
            //log.info('Notifications are not supported on this system')
            return false
        }

        let n = new Notification({
            title: title,
            body: body,
            silent: false,
            icon: ICO_WARNING,
        })

        n.show()
    }

    info(body, title = "Info", onShow = null, onClick = null, onRelpy = null) {

        if (!Notification.isSupported()) {
            //log.info('Notifications are not supported on this system')
            return false
        }

        let n = new Notification({
            title: title,
            body: body,
            silent: true,
            icon: ICO_INFO,
        })

        if (onClick) { n.on('click', onClick)}
        n.show()
    }

    debug(body, title = "Debug", onShow = null, onClick = null, onRelpy = null) {

        if (!Notification.isSupported()) {
            //log.info('Notifications are not supported on this system')
            return false
        }

        let n = new Notification({
            title: title,
            body: body,
            silent: true,
            icon: ICO_DEBUG,
        })

        n.show()
    }

    message(body, title = "Message", onShow = null, onClick = null, onRelpy = null) {

        if (!Notification.isSupported()) {
            //log.info('Notifications are not supported on this system')
            return false
        }

        let n = new Notification({
            title: title,
            body: body,
            silent: true,
            icon: ICO_GENERIC,
            //hasReply: false,
            //replyPlaceholder: 'Type Here!!'
        })

        //if (onShow) n.on('show', )
        //if (onClick) n.on('click', () => onClick)
        //if (onRelpy) n.on('reply', (e, reply) => onRelpy(e, reply))

        n.show()
    }

}

module.exports = new Notifier()
