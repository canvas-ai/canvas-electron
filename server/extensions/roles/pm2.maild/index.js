'use strict'

const Role          = require('../role')
const MailListener  = require('mail-listener-fixed2')
const notify        = require('../../gui/utils/notifier')

const default_config = {
    connTimeout: 5000, // Default by node-imap
    authTimeout: 5000, // Default by node-imap,
    debug: null, //console.log, // Or your custom function with only one incoming argument. Default: null
    tlsOptions: { rejectUnauthorized: true },
    mailbox: "INBOX", // mailbox to monitor
    searchFilter: ["UNSEEN", "FLAGGED"], // the search filter being used after an IDLE notification has been retrieved
    markSeen: false, // all fetched email willbe marked as seen and not fetched next time
    fetchUnreadOnStart: false, // use it only if you want to get all unread email on lib start. Default is `false`,
    mailParserOptions: { streamAttachments: false }, // options to be passed to mailParser lib.
    attachments: false, // download attachments as they are encountered to the project directory
    attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
}

const DEFAULT_MAX_LISTENERS = 10

const fs            = require('fs')
const path          = require('path')
const configfile    = path.resolve(__dirname, '../../../config/role.maild.json')
const data          = fs.readFileSync(configfile, 'utf8')

const config = JSON.parse(data)

class MailD {

    constructor() {

        console.log('Mail notifier consturctor')
        this.accounts = new Array(DEFAULT_MAX_LISTENERS)
        this.listeners = new Array(DEFAULT_MAX_LISTENERS)

        for (const account in config) {
            if (! config[account].enabled) {
                console.log(`account ${account} disabled`)
            } else {
                console.log(`Loading configuration options for account ${account}`)
                this.accounts[account] = {...default_config, ...config[account]}    
            }
        }

    }

    start() {
        console.log('MailD start')
        for (let account in this.accounts) {
            console.log(`Starting listener for account ${account}`)
            let listener = new MailListener(this.accounts[account])
            this._setupEventEmitters(account, listener)
            this.listeners[account] = listener
            listener.start()
        }
    }

    stop() {
        console.log('MailD stop')
        this.listener.stop()
    }

    restart() {

    }

    status() {

    }

    register() {

    }

    unregister() {

    }

    _setupEventEmitters(account, listener) {

        listener.on("server:connected", function(){
            console.log("imapConnected")
            notify.info("imapConnected")
        })
           
        listener.on("server:disconnected", function(){
            console.log("imapDisconnected")
            notify.info("imapDisconnected")
        })
           
        listener.on("error", function(err){
            console.log(err);
            notify.err(err)
        })
           
        listener.on("mail", function(mail, seqno, attributes){
            // do something with mail object including attachments
            console.log("emailParsed", mail.subject);
            notify.info(
                `Subject: ${mail.subject}`, 
                `[${account}] New email from ${mail.from.text}`, 
                null, () => {
                    console.log("click")
                    /*
                    fs.writeFileSync('/tmp/test.eml', mail.eml)
                    const  EmlParser = require('eml-parser')

                    new EmlParser(fs.createReadStream('/tmp/test.eml'))
                    .getEmailBodyHtml()
                    .then(htmlString  => {
                        console.log('sme tu')
                        console.log(htmlString)
                        fs.writeFileSync('/tmp/test.html', htmlString)
                    }) 
                    .catch(err  => {
                        console.log(err);
                    }) */

                })

        })
           
        listener.on("attachment", function(attachment){
            console.log(attachment.path);
        })
    }

}

// Role should always be a singleton
module.exports = new MailD