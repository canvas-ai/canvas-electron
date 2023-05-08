'use strict'


const path = require('path')
const Conf = require('conf') // Temporary

// Trees are versioned in the database
class TreeIndex extends Conf {

    // TODO: Use a more sensible fallback location
    constructor(userDataPath) {

        let dataDir = path.dirname(userDataPath)
        let configName = path.basename(userDataPath, ".json")

        super({
            configName: configName,
            cwd: dataDir
        })
    }

    putSync(key, value) { return this.set(key, value); }

    next() {}

    previous() {}

    listVersions() {}

}


module.exports = TreeIndex
