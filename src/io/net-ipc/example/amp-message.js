var Message = require('amp-message');
 

var msg = new Message;
 
console.log(msg.toBuffer());
 
//msg.push('foo');
//msg.push('bar');
//msg.push('baz');
/*msg.push({
  test1: 'test',
  test2: 'test2'
})*/
console.log(msg.toBuffer());
 
//msg.push({ foo: 'bar' });
console.log(msg.toBuffer());
 
var other = new Message(msg.toBuffer());

console.log('----------------------');
console.log(other); 
console.log(other.args); 
console.log('----------------------');


console.log(other.shift());
console.log(other.shift());
console.log(other.shift());
