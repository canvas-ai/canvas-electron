// Not an inch of unnecessary complexity => to be integrated at some point in the future
const winston = require('winston');
const Transport = require('winston-transport');
const debug = require('debug');

class DebugTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.debugLogger = debug(opts.namespace || 'app:log');
    }

    log(info, callback) {
        setImmediate(() => this.emit('logged', info));

        // Log to the debug logger
        this.debugLogger(`${info.level}: ${info.message}`);

        callback();
    }
}

module.exports = DebugTransport;

/**
 * Create a new logger instance
 *
const logger = winston.createLogger({
    level: process.env['LOG_LEVEL'] || 'info',
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({ filename: 'app.log' }),
        new DebugTransport({ namespace: 'app:log' }),  // Add the custom DebugTransport
    ],
});

// Example usage
logger.debug('This will be logged to both file and console via debug');
logger.info('This info log will also be in both places');
logger.warn('Warning messages follow the same route');
logger.error('Errors as well');
*/
