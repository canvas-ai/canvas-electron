const EventEmitter = require('eventemitter2');

class Service extends EventEmitter {

    #servicePath;
    #serviceOptions;

    constructor(options) {

        super(options);
        this.options = options;
        this.status = 'initialized';
    }

    async start() {
        this.status = 'running';
    }

    async stop() {
        this.status = 'stopped';
    }

    async restart() {}

    isRunning() { return this.status === 'running'; }
    status() { return this.status; }

}

module.exports = Service;
