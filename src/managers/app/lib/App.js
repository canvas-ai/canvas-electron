const EventEmitter = require('eventemitter2');

class App extends EventEmitter {

    constructor(options) {
        super(options);
        this.options = options;
    }

}

module.exports = App;
