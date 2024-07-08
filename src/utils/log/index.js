'use strict';


/**
 * utils \ Log
 */


/*
 TODO: Change to
 > https://www.npmjs.com/package/winston
 > https://github.com/winstonjs/winston/tree/master/examples

 TODO: @RFC5424
     error: 0,   *
     warn: 1,    *
     info: 2,    *
     verbose: 3,
     debug: 4,   *
     silly: 5
 */

// Utils
const color = require('chalk');

const LOG_LEVEL = [
    'null',     // 0
    'error',    // 1
    'warn',     // 2
    'info',     // 3
    'verbose',  // 4
    'debug',     // 5
];
const DEFAULT_VERBOSITY = 5;
const DEFAULT_DESTINATION = 'stdout';


var LOGGERS = new Map();

class Log {

    #name;
    #path;

    constructor(name, options) {

        this.#name = name;

        options = {
            path: DEFAULT_DESTINATION,
            logLevel: DEFAULT_VERBOSITY,
            color: true,
            prettifyJSON: false,
            ...options,
        };

        this.#path = options.logPath;

        this.logLevel = parseLogVerbosity(process.env['LOG_LEVEL'] || options.logLevel); // TODO: Fixme, ugly
        this.color = options.color;
        this.prettifyJSON = options.prettifyJSON;

    }

    get name() { return this.#name; }
    get path() { return this.#path; }

    print(...msg) { console.log(JSON.stringify(msg, null, 2)); }
    console(msg) { console.log(msg); }

    debug(...msg) {
        if (this.logLevel < 5) {return;}
        else {console.log(color.blue(getTimestamp() + `|DEBUG|${this.#name}|` + parseMessage(msg, this.prettifyJSON)));}
    }

    info(...msg) {
        if (this.logLevel < 3) {return;}
        else {console.log(color.green(getTimestamp() + `|INFO|${this.#name}|` + parseMessage(msg, this.prettifyJSON)));}
    }

    warn(...msg) {
        if (this.logLevel < 2) {return;}
        else {console.log(color.yellow(getTimestamp() + `|WARN|${this.#name}|` + parseMessage(msg, this.prettifyJSON)));}
    }

    error(...msg) {
        if (this.logLevel < 1) {return;}
        else {console.error(color.red(getTimestamp() + `|ERROR|${this.#name}|` + parseMessage(msg, this.prettifyJSON)));}
    }

}

// One global logger vs per instance?
module.exports = (name = 'app', opts = {}) => {

    if (!LOGGERS.has(name)) {
        LOGGERS.set(name, new Log(name, opts));
    }

    return LOGGERS.get(name);
};

function parseMessage(msg, prettyPrint = false) {

    // If we got a string just return it
    if (typeof msg === 'string') {return msg;}

    // TODO: Rewrite
    // Return as text if a simple array is supplied
    //if (msg.filter(v => typeof v == 'object').length > 0 )
    //if (msg.filter(Array.isArray).length === 0) return msg.join(" ")
    if (!prettyPrint) {return JSON.stringify(msg);}
    return JSON.stringify(msg, null, 2);

}

function parseLogVerbosity(v) {

    if (isNaN(v) && LOG_LEVEL.indexOf(v) > 0) {return LOG_LEVEL.indexOf(v);}

    let level = parseInt(v);
    if (level >= 0 && level < LOG_LEVEL.length) {return level;}

    return DEFAULT_VERBOSITY;

}

function getTimestamp() {

    return new Date().toISOString()
        .replace(/-/g,'')
        .replace(/:/g,'')
        .replace(/Z/,'');
    /*
    let date = new Date()
    let y = date.getFullYear()
    let m = addLeadingZero(date.getMonth())
    let d = addLeadingZero(date.getDay())
    let H = addLeadingZero(date.getHours())
    let M = addLeadingZero(date.getMinutes())
    let S = addLeadingZero(date.getSeconds())
    let MS = date.getMilliseconds()
    return (`${y}${m}${d}-${H}${M}${S}.${MS}`) //.toString()
    */
}

function addLeadingZero(n) { return (n <= 9) ? '0' + n : n; }
