const EventEmitter = require('eventemitter2');

class Role extends EventEmitter {

    constructor(options) {
        super(options);
        this.options = options;

        this.name = options.name;
        this.description = options.description;
        this.version = options.version;
        this.author = options.author;
        this.backend = options.backend;
    }

    start() {}

    stop() {}

    restart() {}

    status() {}

    // initialize(options) {}

}

module.exports = Role;
