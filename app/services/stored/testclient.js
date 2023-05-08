

const Storage = require('.')
const storage = new Storage()

storage.addBackend("s3", {})
let oid = storage.put('~/Desktop/Autiaky')
storage.moveTo()
