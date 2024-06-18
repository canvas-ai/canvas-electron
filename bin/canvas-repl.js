#!/usr/bin/env node

// Assuming node is installed and within PATH
// Enable the below if --use-system-nodejs is supplied
const path  = require('path')
const app = path.join(path.dirname(__dirname), 'src', 'repl')
require(app)
