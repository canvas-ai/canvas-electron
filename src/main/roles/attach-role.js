var exec = require('child_process').exec;

function attachContainer(name) {
    return new Promise(function(resolve, reject) {
        exec('docker ps -f name=' + name, function(err, stdout, stderr) {
            if (err || stderr) {reject(err || stderr);}

            if (!stdout.includes(name)) {reject('Container is not running');}
            exec('konsole -e docker exec -it ' + name + ' bash');
            resolve(null);
        });
    });
}

module.exports = { attachContainer };
