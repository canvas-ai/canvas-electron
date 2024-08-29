module.exports = {
    apps: [{
        name: 'canvas-server',
        script: './src/init.js',
        env_production: {
            NODE_ENV: 'production',
        },
        env_development: {
            DEBUG: 'canvas*',
            NODE_ENV: 'development',
        },
    }],
};
