


const log = console.log

const device = require('../device')

var polo = require('polo');
var apps = polo({
    multicast: true,     // disables network multicast,    
    heartbeat: 1000 // set the service heartbeat interval (defaults to 2min)
});


apps.put({
    id: 123456, //device.id,
    hostname: device.hostname,
    name: 'pub',  // required - the name of the service
    host: device.ip,        // defaults to the network ip of the machine
    port: 1234,             
    url: `http://${device.ip}:1234/pub`
})

apps.on('up', function(name, service) {                   // up fires everytime some service joins
    console.log(apps.get(name));                        // should print out the joining service, e.g. hello-world
})

apps.on('down', function(name, service) {                   // up fires everytime some service joins
    log('down')
    log('---- SERVICE that left -----')
    log(service)
    log('---- SERVICE -----')
    console.log(apps.get(name));                        // should print out the joining service, e.g. hello-world
})
