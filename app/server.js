"use strict";

/**
 * Canvas server
 */

const Canvas = require("./main");
const canvas = new Canvas();
canvas.start();

const context = canvas.context;
const index = canvas.index;

console.log(index.listDocumentSchemas())
/*
index.insertDocument({
  type: "data/abstraction/tab",
  data: {
    url: "https://www.test.com/search?q=canvas+server",
    title: "canvatestch",
  },
});

index.insertDocument({
  type: "data/abstraction/note",
  data: {
    title: "Note from" + new Date(),
    body: "This is a test note" + new Date(),
  },
});
*/


