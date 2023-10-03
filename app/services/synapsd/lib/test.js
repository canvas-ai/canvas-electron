

const Db = require('../../db')
const db = new Db({
    path: 'tmp/testdb'
})

const Bitmap = require('./Bitmap')
const bitmap = new Bitmap('testbitmap', db)

