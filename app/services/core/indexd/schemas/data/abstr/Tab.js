
/**
 * Data abstraction to store browser tab data
 */

const Document = require('../../Document')

// Constants
const DEFAULT_BACKEND = 'db'


class Tab extends Document {

    constructor(params) {
        super({
            ...params,
            type: 'data/abstraction/tab',
        })
    }



}

module.exports = Tab
