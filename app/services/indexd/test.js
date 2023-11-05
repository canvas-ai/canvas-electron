const Db = require('../db')
const db = new Db({
    path: '/tmp/synapsd.testdb'
})

const { Index, Document } = require("flexsearch");
const fts =  new Document({
    id: "id",
    encoder: 'advanced',
    index: [{
        field: "data:title",
        tokenize: "forward",
        optimize: true,
        resolution: 9
    },{
        field:  "data:content",
        tokenize: "full",
        optimize: true,
        resolution: 5,
        minlength: 3,
        context: {
            depth: 1,
            resolution: 3
        }
    }]
});

for (let key of db.getKeys()) {
    let val = db.get(key)
    fts.import(key, val)
}


const Note = require('../../schemas/abstr/Note')

/*const SynapseD = require('./index.js');
const db = new SynapseD({
    path: '/tmp/synapsd.testdb'
});
*/
for (let i = 1; i <= 10000; i++) {
    let note = new Note({
        id: Number(i),
        data: {
            title: 'Test note ' + i,
            content: 'This is a test note number ' + i
        },
        meta: {
            tags: ['test', i]
        }
    })

    fts.add(i, note)
}

let text = 'note 33'

console.log(fts.search(text));
fts.export(function(key, data){

    // you need to store both the key and the data!
    // e.g. use the key for the filename and save your data
    console.log(key)
    db.put(key, data)

});

//fts.search(text, limit);
//fts.search(text, options);
//fts.search(text, limit, options);
//fts.search(options);

/*
db.insertDocument(document, ['foo', 'bar', 'baz'], ['note', 'testfeature1', 'testfeature2'])
    .then((doc) => {
        console.log(doc)
    })
    .catch((err) => {
        console.error(err)
    })
*/
