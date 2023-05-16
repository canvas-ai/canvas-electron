const chokidar = require('chokidar');
const fs        = require('fs')
const log       = console.log

// One-liner for current directory
/*chokidar.watch('/home/idnc_sk/Desktop').on('all', (event, path) => {
  console.log(event, path);
});
*/


// this code is run twice
// see implementation notes below
console.log(process.pid);

// after this point, we are a daemon
require('daemon')();
 
// different pid because we are now forked
// original parent has exited
console.log(process.pid);

var dirlist = []

class WatchD {

    constructor(paths = []) {

        if (paths.length === 0) { 
            log('WatchD needs at least one path on init, program will exit')
            process.exit(1)
        }

        // Fork watchd process

    }

}


const watcher = chokidar.watch('/home/idnc_sk/Desktop')


// add directory
    // index ? move ? copy
    // changelog (xxhash table?)
        // commit
            // to cache
            // to syncd(portable/cache/sha, [backenda:path, backendb:path])


watcher.on('ready', () => log(`Initial scan of "/home/idnc_sk/Desktop" complete. Ready for changes`))
watcher.on('unlink', path => log(`File ${path} has been removed`));
watcher.on('change', (path, stats) => {
    //if (stats) console.log(`File ${path} changed size to ${stats.size}`);
    log(`Path ${path} changed`)

    log(stats)
});

watcher.on('add', (path, stats) => {
    
    if (!stats.isFile()) {
        log(`"${path}" not a file, ignoring..`)
        return
    }
    
    if (stats.size === 0) {
        log(`Ignoring 0-length file "${path}"`)
        return
    }

        
    var input = fs.createReadStream(path)
    var output = cache.putAsStream('test', input)
    
    input.pipe(output)
    //stream.on('data', (chunk) => {
        
    output.on('integrity', d => console.log(`integrity digest is ${d}`))
    //})

    input.on('end', () => {
        log('stream end')
    })
    /*
     {
        //hash.update(data, 'utf8')
    
    })

   stream.on('end', function() {
        index.add(path, hash.digest('hex'))
        //log(`Path: ${path} | md5: ${hash.digest('hex')}`)
    })
    */

});
