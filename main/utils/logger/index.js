// Includes
const winston = require('winston');


class Log {

    constructor({
        logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
        logPath = '../../../var/log',
        format = winston.format.json(),
        appName = 'canvas',
    } = {}) {

        this.logLevel = logLevel;
        this.logPath = logPath;
        this.format = format;
        this.appName = appName;

        this.logger = winston.createLogger({
            level: this.logLevel,
            format: this.format,
            defaultMeta: { service: this.appName },
            transports: [
                new winston.transports.File({ filename: `${this.logPath}/error.log`, level: 'error' }),
                new winston.transports.File({ filename: `${this.logPath}/combined.log` }),
            ],
        });

        // In development mode, also log to the console.
        if (this.logLevel === 'debug') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.simple(),
            }));
        }
    }

    createLogger(moduleName) {
        return {
            log: (level, message, ...meta) => {
                this.logger.log(level, `${moduleName}: ${message}`, ...meta);
            },
        };
    }
}

module.exports = Log;
