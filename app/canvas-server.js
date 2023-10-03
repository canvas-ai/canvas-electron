"use strict";


/**
 * Canvas server (test)
 */

const Canvas = require("./main");
const canvas = new Canvas();
canvas.start('/');

const context = canvas.context;
console.log(context.listDocuments());

context.set('/foo/bar/baz')
console.log(context.insertDocument({
  type: "data/abstraction/tab",
  data: {
    url: "https://www.test.com/search?q=canvas+server",
    title: "canvas test /foo/bar/baz",
  },
}))
console.log(context.listDocuments());

context.set('/foo/baz/bar')
console.log(context.insertDocument({
  type: "data/abstraction/tab",
  data: {
    url: "https://www.test.com/search?q=canvas+server",
    title: "canvas test /foo/baz/bar",
  },
}))

console.log(context.listDocuments());

context.set('/foo')
console.log(context.listDocuments());

//canvas.shutdown();

