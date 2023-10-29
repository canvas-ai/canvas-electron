/**
 * Canvas server (test)
 */

// Utils
const path = require('path')
const os = require('os')

// CLI
const cli = require('./ui/cli/server')

// Canvas
const Canvas = require('./main')
const canvas = new Canvas();

// Start
(async () => {
  await canvas.start();
})();
