const Index = require('./index')
const index = new Index({
    path: '/tmp/synapsd.testdb'
})


const Note = require('../../schemas/abstr/Note')
const note = new Note({
    data: {
        title: 'Test note ' + 1,
        content: 'This is a test note number ' + 1
    },
    meta: {
        tags: ['test', 1]
    }
})

const note2 = new Note({
    data: {
        title: 'Test note ' + 2,
        content: 'This is a test note number ' + 2000
    },
    meta: {
        tags: ['test', 2]
    }
})

index.insertDocument(note2)


/*
console.log('index.insertDocument(note)')
index.insertDocument(note).then((result) => {
    console.log('index.insertDocument(note) result')
    console.log(result)
    console.log(index.listDocuments())
}).catch((err) => {
    console.log(err)
})

console.log('index.listDocuments()')
console.log(index.listDocuments())
index.documents.listKeys().forEach(element => {
    console.log(element)
});

index.documents.listValues().forEach(element => {
    console.log('Value ' + element)
    console.log(element)
});
*/

console.log('index.bitmaps()')
console.log(index.bitmaps.listEntries())

console.log('index.listKeys()')
console.log(index.documents.listKeys())

console.log('index.listValues()')
console.log(index.documents.listValues())
