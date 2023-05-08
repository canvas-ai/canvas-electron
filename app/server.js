"use strict";

/**
 * Canvas server
 */

const Canvas = require("./main");
const canvas = new Canvas();
canvas.start();

const context = canvas.context;
const index = canvas.index;

index.insertDocument({
  type: "data/abstraction/tab", // type is a feature bitmap too
  data: {
    url: "https://www.test.com/search?q=canvas+server",
    title: "canvatestch",
  },
});

index.insertDocument({
  type: "data/abstraction/note", // type is a feature bitmap too
  data: {
    title: "Note from" + new Date(),
    body: "This is a test note" + new Date(),
  },
});
