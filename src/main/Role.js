
/*
https://www.npmjs.com/package/dockerode
container.inspect(options) - Docker API Endpoint
container.start(options) - Docker API Endpoint
container.stop(options) - Docker API Endpoint
container.pause(options) - Docker API Endpoint
container.unpause(options) - Docker API Endpoint
container.restart(options) - Docker API Endpoint
container.kill(options) - Docker API Endpoint
container.attach(options) - Docker API Endpoint
container.remove(options) - Docker API Endpoint
container.logs(options) - Docker API Endpoint
container.stats(options) - Docker API Endpoint
*/

class Role {

    constructor(name, description) {
        this.name = name;
        this.description = description
    }

    inspect() { }

    start() { }

    stop() { }

    pause() { }

    unpause() { }

    restart() { }

    kill() { }

    attach() { }

    remove() { }

    logs() { }

    stats() { }

    status() {}

}

module.exports = Role;

