"use strict";


/**
 * Canvas server (test)
 */

const Canvas = require("./main");
const canvas = new Canvas();
canvas.start();

const context = canvas.context;
console.log(context.listDocuments());

context.set('/foo/bar/baz')
console.log(context.listDocuments());
console.log(context.insertDocument({
  type: "data/abstraction/tab",
  data: {
    url: "https://www.test.com/search?q=canvas+server",
    title: "canvatestch",
  },
}))

canvas.shutdown();
