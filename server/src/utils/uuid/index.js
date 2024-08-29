const crypto = require('crypto');


// Credits
// https://gist.github.com/LeverOne/1308368
// https://gist.github.com/jed/982883

function uuid(delimiter = true) {
    return (delimiter) ?
        ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16)) :
        ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16));
}

function uuid12(delimiter = true) {
    return (delimiter) ?
        ([1e3]+-1e3+-1e3).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16)) :
        ([1e3]+1e3+1e3).replace(/[018]/g,b=>(b^crypto.rng(1)[0]%16>>b/4).toString(16));
}

module.exports = {
    uuid,
    uuid12,
};
