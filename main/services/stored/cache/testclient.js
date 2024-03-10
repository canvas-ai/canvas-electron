

const fs = require('fs')
const Cache = require('./index.js')

const c = new Cache('/tmp/test-cache')


c.put('0x06', fs.readFileSync('/home/idnc_sk/Valpejpre/Hong-Kong-Wallpaper-11-1600x900.jpg'), {
    algorithms: ['sha1']
})
c.list().then(
    function(data) {
        console.log('---------- toto su data ----------')
        console.log(data)
    },
    console.error
)
    
c.listAsStream()
    .on('data', (data) => {
        console.log(`Key ${data.key}`)
        console.log(`Path ${data.path}`)
    })

c.hasByKey('0x01').then(
    function(data) {
        if (data === null) {
            console.log('ok asi nemame')
            return false
        }
        console.log(data)
    }
)

c.hasByHash('sha1-dOpboFFu9ROAHCpy/ZlsVPUScvw=')
.then(console.log)