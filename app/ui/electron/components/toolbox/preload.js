const { contextBridge } = require('electron')
const ContextD = require('../../../core/contextd')
const context = new ContextD()

contextBridge.exposeInMainWorld('ipc', {
  context
})
