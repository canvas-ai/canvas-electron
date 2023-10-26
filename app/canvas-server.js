/**
 * Canvas server (test)
 */

// Utils
const path = require('path')
const os = require('os')
const minimist = require('minimist')

// Canvas
const Canvas = require('./main')

// Parse command line arguments
const args = minimist(process.argv.slice(2), {
  alias: {
    'help': 'h',
    'version': 'v',
    'paths': 'p'
  }
})

if (args.help) {
  console.log('Usage: canvas-server [options]');
  console.log('h, help         Print this help');
  console.log('v, version      Print version');
  console.log('p, paths        Print paths');
  process.exit(0)
}

// Start canvas
(async () => {
  const canvas = new Canvas();
  await canvas.start();

  const context = canvas.createContext("/foo/bar/baz");
  console.log(context.listDocuments());
  context.set('/')
  console.log(await context.insertDocument({
    type: "data/abstraction/tab",
    data: {
      url: "https://www.test.com/search?q=canvas+server",
      title: "canvas test /foo/bar/baz",
    },
  }))
  console.log(context.listDocuments());

  context.set('/foo/baz/bar')
  console.log(await context.insertDocument({
    type: "data/abstraction/tab",
    data: {
      url: "https://www.test.com/search?q=canvas+server",
      title: "canvas test /foo/baz/bar",
    },
  }))

  console.log(context.listDocuments());

  context.set('/foo')
  console.log(context.listDocuments());

  canvas.shutdown();

})();



