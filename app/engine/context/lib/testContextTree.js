const Tree = require('./Tree')
const tree = new Tree()

let json_clean = '{}'
tree.insert('foo/bar/baz')
//tree.insert('test1')
//tree.insert('test2/test3')
//tree.insert('testZ/test123/few/q')
let backup = tree.getJsonIndexTree()
console.log(tree.getJsonTree())
tree.clear()
console.log(tree.getJsonTree())
tree.load(backup)
console.log('Final JSON tree -------')
console.log(JSON.stringify(tree.getJsonTree(), null, 4))


/*
tree.insert('universe://foo')
console.log('JSON tree')
console.log(JSON.stringify(tree.getJsonTree(), null, 4))

tree.insert('/foo2/bar/mek')
tree.insert('universe://foo2/stanica')
tree.save()
tree.load()
tree.insert('foo2/druhastanica')
tree.save()

tree.move('/foo', '/test1')
console.log('JSON Index tree')
console.log(JSON.stringify(tree.getJsonIndexTree(), null, 4))
tree.save()

tree.renameLayer('mek', 'newMekky')
tree.save()

console.log('JSON tree')
console.log(JSON.stringify(tree.getJsonTree(), null, 4))
tree.save()

let testJson = `{"id":0,"name":"/","label":"universe","description":"And then there was light","color":"#fff","children":[{"id":"eb5c-5464-0434","name":"test1","label":"test1","description":"","color":"auto","children":[{"id":"4cae-3b3f-5304","name":"test2","label":"test2","description":"","color":"auto","children":[{"id":"0645-fb82-c93d","name":"test3","label":"test3","description":"","color":"auto","children":[]}]}]}]}`
tree.load(testJson)
tree.save()

tree.insert('/foo/bar')
tree.insert('/test/test1/test2/test3/test4')

let node = tree.getNode('/foo/bar')
console.log(tree.insertNode('/test/test1', node))

console.log('JSON tree')
console.log(JSON.stringify(tree.getJsonTree(), null, 4))

console.log('JSON INDEX tree')
console.log(JSON.stringify(tree.getJsonIndexTree(), null, 4))

//console.log(tree.remove('/test/test1/test2/test3'))
//console.log(tree.move('/foo/bar', '/test'))
*/
