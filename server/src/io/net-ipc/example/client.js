'use strict';

const Client = require('../index').Client;
const client = new Client().connect();

const rl = require('readline');
const cli = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
});


client.on('ready', (te) => {

    console.log(te);
    //const sockID = id

});

cli.prompt();
cli.on('line', (input) => {

    if (input == 'req') {
        client.req(input, (res) => {

            console.log('Req/res test');
            console.log(res);
  
        });
  
    } else {
        client.send(input);
    }

    cli.prompt();

});

client.on('data', (data) => {
    console.log('================== ret ============== ');
    console.log(data);
});
