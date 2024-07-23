const EventEmitter = require('eventemitter2');

class Toolbox extends EventEmitter {
    constructor() {
        super();
        this.tools = [];
    }

    register(tool) {
        if (!tool.name) {throw new Error('Tool name is mandatory');}
        if (!tool.icon) {throw new Error('Tool icon is mandatory');}
        if (!tool.action) {throw new Error('Tool action is mandatory');}
        this.tools.push(tool);
        this.emit('tool-registered', tool);
    }

    unregister(tool) {
        const index = this.tools.indexOf(tool);
        if (index === -1) {return;}
        this.tools.splice(index, 1);
        this.emit('tool-unregistered', tool);
    }

    toggle() {
        this.emit('toolbox-toggled');
    }
}

// Singleton
module.exports = new Toolbox();
