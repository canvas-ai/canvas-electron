const EventEmitter = require('eventemitter2');


const SERVICE_STATUS_ARRAY = [
    'initialized',
    'running',
    'stopped'
]

class Service extends EventEmitter {

    #status = SERVICE_STATUS_ARRAY[0];

    constructor(options = {}) {

        super(options);

        if (new.target === Service) {
            throw new TypeError("Abstract class, can not be initialized, needs to be extended.");
        }

        // Ensure subclasses implement required methods
        if (this.start === Service.prototype.start) {
            throw new TypeError("Subclasses must implement the 'start' method.");
        }

        if (this.stop === Service.prototype.stop) {
            throw new TypeError("Subclasses must implement the 'stop' method.");
        }

    }

    async start() {
        throw new Error("Method 'start' not implemented in subclass.");
    }

    async stop() {
        throw new Error("Method 'stop' not implemented in subclass.");
    }

    async restart() {
        await this.stop();
        await this.start();
    }

    // Added a setStatus to ensure only valid statuses can be set
    setStatus(status) {
        if (!SERVICE_STATUS_ARRAY.includes(status)) {
            throw new Error("Invalid status.");
        }
        this.#status = status;
    }

    getStatus() { return this.#status; }
    isRunning() { return this.#status === 'running'; }
}

module.exports = Service;
