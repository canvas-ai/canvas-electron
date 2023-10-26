'use strict'

const Server = require('../index').Server
const server = new Server()
server.start()

const rl = require("readline")
const cli = rl.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
})

cli.prompt()
cli.on('line', (input) => {


    switch (input) {

      case "list":
        console.log(server.getClients())
        break
      case /^req*/:
        server.req(input, (rep) => {
          console.log('Mame reply')
          console.log(rep)
        })    
        break
      default:  
        server.send(input)
        break

    }

    cli.prompt()

})

server.on('data', (d) => {
  console.log('Aha co mam od servera')
  console.log(d)
})

server.on('req', (data, cb) => {
  console.log('Dostal som request')
  console.log(data)

  let reply = 'ak toto bude fungovat tak pecka!'

  cb(reply)

})


server.on('connect', (e) => { console.log(e) })
server.on('disconnect', (r) => { console.log(r) })
server.on('errror', (e) => { console.log(e) })