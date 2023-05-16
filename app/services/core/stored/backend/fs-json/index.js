


// These modules suppose to be as stupid as possible
// They can be included directly(require(storage/backends/fs-json))

const FILE_EXT = "json"


const supportsVersions = true

module.exports = {

    // Methods
    create: create,
    update: update,
    remove: remove,
    rename: move,
    move: move,
    copy: copy,

    // Vars
    supportsVersions: supportsVersions
}

// Hight level interface

/**
 * @description Writes data to dst(sync)
 * @param string dst: File destination dir
 * @param string name: File name, will be appended with FILE_EXT
 * @param any data: We'll check for the type of data comming in
 * @param opts: dwqdwq
 * @returns bool
 */
function create(dst, name, data, opts = {}) {
    return true
}

function update() {}

function remove() {}

function move(src, dst) {}

function copy(src, dst) {}




// Low level interface
//open
//close
//seekTo
//read(bytes, offset)
//write(bytes, offset)
//getByteRange
