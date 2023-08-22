const EventEmitter = require('eventemitter2');

class Role extends EventEmitter {

    constructor(options) {
        super(options);
        this.options = options;
    }

}

module.exports = Role;
