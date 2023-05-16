'use strict'


/**
 * data.abstraction.File
 */


const StorageAbstraction = require('../StorageAbstraction')


// Utils
const log           = console.log

//const fileinfo      = require('./fileinfo')
//const hash          = require('./hash')
//const { struct }    = require('superstruct')

//const Data          = require('../../')



/*
Stary sposob:
data.move(file, src, dst)
data.add(file, meta, data, opts = {})
data.del(file, opts)
data.add(note, meta, data, opts = {})
data.get(file, )

Novy sposob
Output vector [] (maxSize:255)
<> stream
.filter type: file
.filter mimeType: text-plain
.filter name 'zzz'
.filter type: +note
.filter name -zzz, +test
>>> results [{objArray}]
  > data.getByHash(obj.sha1, abstraction = note)
    > pipe data to note handler before printing

  {file} = require)data/abstr/file)



const schema = {


  mimeType: k|bitmap
  ext: k|bitmap
  hash:
    k|v
  name:


}*/


class File extends StorageAbstraction {

/**
 *Creates an instance of File
 * @param {*} f : File path
 * @param {*} hash : Hash ID(will be generated if missing)
 * @memberof File
 */
constructor(f, hash) {


    this.id = 0

    this.names = new Set()
    this.paths = new Set()

    super()

  }

  /**
   * Methods
   */
  async save() {}

  async remove() {}

  async rename() {}


}

class Files {


    constructor(f) {

      this.namespace = 'data/files'
      this.abstraction = 'file'
      this.useCache = true


      // bySha1
      // sha1: { paths: {}}
      // byMimeType
      // byKey
      // byHash sha1: 123
      // byName (Sams* )
      // byExt (.txt .xls .zfs .ini .png)

    }

    create() {

    }

    async add(f) {

      if (!fs.existsSync(f)) {
        log(`File ${f} not found`)
        return false
      }

      let hash = await hash.checksumFile(f, 'sha1')
      let o = index.getByHash(`sha1:${hjsh}`) || new File(f, hash)

      if (this.hashmap.indexOf(hash) > 0) {
        // already present
        let meta = super.getMeta(hash)
        meta.paths.push(file) // paths je set
      }

      let meta = {

      }

      bitmap[file.mimeType].set(oid)

    }

    addDirectory(dir, recursive = false) {

    }

    delete(filePath) {}

    update(filePath, meta, data) {}

    list() {}


    getByObjectID(id) {}
    getMetaByObjectID(id) {}
    getDataByObjectID(id) {}

    getByHash(hash) {}
    getByHash(hash) {}
    getByHash(hash) {}

    getByKey(key) {}


    _scanDirectory(dir, filter = {}) {
        //filter.fileTypes
        //filter.include
        //filter.exclude
    }

}

module.exports = File

/*

async addFile(f, h) {

    if (!fs.existsSync(f)) {
      log(`File ${f} not found`)
      return false
    }

    let objectID = ''
    let abstraction = 'file'

    let fileHash = await hash.checksumFile(f)
    let fileDB = this.abstr.file._index // this is ugly ugly very ugly tofix toremove

    try {
      var fo = await fileDB.get(fileHash)
    } catch (err) {
      if (err.type === 'NotFoundError') {
        fo = null
      } else {
        log(err)
        fo = false
      }
    }

    if (fo) {
      log (`uz mame ${f}`)
    }



    let finfo = await fileinfo(f)

    let key = fileHash

    let ext = file.ext
    let type = file.contentType

    if (typeof this.extIndex[ext] === 'undefined') {
      this.extIndex[ext] = new bitmap([key])
    } else {
      this.extIndex[ext].add(key)
    }

    if (typeof this.typeIndex[type] === 'undefined') {
      this.typeIndex[type] = new bitmap([key])
    } else {
      this.typeIndex[type].add(key)
    }


  }





 // Abstractions -> this needs to be handled by abstractions, index class should only
    // provide a universal interface  >> TODO: Move to data/abstractions/<abstr>
    this.abstractions = sublevel(this.db, 'abstr')
      // File
        // hashmap
        // oidToMimeType
        // oidToMimeExt
        // oidToFileExt
    this.abstr = {}
    this.abstr.file = {
      _index: sublevel(this.abstractions, 'file_index', {
        valueEncoding: 'json'
      }),
      oidToMimeType: sublevel(this.abstractions, 'file_oid2mimeType', {
        valueEncoding: 'binary'
      }),
      oidToMimeExt: sublevel(this.abstractions, 'file_oid2mimeExt', {
        valueEncoding: 'binary'
      }),
      oidToFileExt: sublevel(this.abstractions, 'file_oid2fileExt', {
        valueEncoding: 'binary'
      })
    }


function resolvePathUrl(p) {
    if (!p || _.isEmpty(p)) { return false }

    let parts = parsePathUrl(p)
    if (parts.device != 'my') {
        log('Only supported for localhost ("my")')
        return false
    }

    return path.join(DIR.WORKSPACES, parts.path)
}


*/
function checksum(str, algorithm, encoding) {
  return crypto
    .createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex')
}


/*

'use strict'

const Context = require('../data/')

/*
const meta = {
    name: 'testsubor',
    ext: 'txt',
    mimeType: 'text/plain'
    paths: [
        '/tmp/testsubor'
    ],
    hash: {
        sha1: '123',
        fuzzy: 'test123'
    },
    created: <>
    modified: <>
    indexed: <>`
    description: 'zzz',

}*/


class File extends Context {


  constructor() {

          super()


  }

  // Created
  // Indexed
  // Modified


  // URI = scheme:[//authority]path[?query][#fragment]
  // scheme:[//[userinfo@]host[:port]]path[?query][#fragment]

  findByName(

      // context namespace
          // .universe \ dxc
      // device
          // ID: i12345 (PRIO 0)
          // Remote
              // Proto http://
              // proto ftp://
          // OS:  PRIO 1
          //

  )

  findByMimeType(mime) {

  }

  findByExtension()

  findByHash() {}

  findByPath() {}

}
