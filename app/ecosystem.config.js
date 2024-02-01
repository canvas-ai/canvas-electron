const dotenv = require('dotenv');
let env = dotenv.config()

module.exports = {
    apps : [{
        name: 'canvas-server',
        script: 'canvas-server.js',
        env: {
            ...env.parsed,
        }
    }]
};
