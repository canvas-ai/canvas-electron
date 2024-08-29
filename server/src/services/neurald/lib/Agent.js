

class Agent {
 

    constructor() {

        this.role = 'agent';
        this.name = 'Agent';
        this.type = 'General';
        this.personality = '';
        

        this.memory = {};

        this.permissions = {
            io: [
                'command',
                'talk',
                'notify',
                'message',
            ],
        };

        // Tools
        // Functions
        //
    }

    startAgent() {}

    stopAgent() {}

    bindInput(input) {

    }

    bindInputStream(input) {

    }

    bindOutput(output) {

    }

    bindOutputStream(output) {

    }

    
}

module.exports = Agent;

