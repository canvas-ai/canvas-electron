'use strict'


// Electron
const {
  app,
  globalShortcut,
  ipcMain,
  BrowserWindow
} = require('electron')

const defaultConfig = {
  align: false,
  alignOffset: 0,
  docked: false,
  alloweRemote: 'ro',
  path: `${__dirname}/front/index.html`,
  attr: {
    title: process.title + ' Canvas',
    fullscreen: false,
    fullscreenable: true,
    frame: true,
    resizable: true,
    width: 640,
    minWidth: 78,
    height: 480,
    minHeight: 480,
    // closable: false,
    // skipTaskbar: false,
    // alwaysOnTop: true,
    // focusable: true,
    openDevTools: true,
    // type: (process.platform === "win32") ? "toolbar" : "dock",
    show: true,
    // disableBlinkFeatures: "Auxclick",
    //icon: path.join(DIR.UI, 'pub', 'icons', 'coffee.png')
    webPreferences: {
      nodeIntegration: true,
      nativeWindowOpen: true,
      enableRemoteModule: true,
      contextIsolation: false
      //sandbox:false,
      //webviewTag:true //for webView
    }

  }
}

var window = {}

// Functions
// -------------------------------------------------------------------------------- //
function init(docked = true) {
  console.log('UI.toolbox.init()')

  window = new BrowserWindow(defaultConfig.attr)

  window.loadURL(`file://${__dirname}/front/index.html`)
  //window.setMenu(null)

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('close', (event) => {
    if (app.isQuitting) {
      app.quit()
    } else {
      event.preventDefault()
      event.returnValue = false
      console.log('UI.toolbox.close')
      window.hide()
    }
  })

  window.onbeforeunload = (e) => {
    console.log('I do not want to be closed')

    // Unlike usual browsers that a message box will be prompted to users, returning
    // a non-void value will silently cancel the close.
    // It is recommended to use the dialog API to let the user confirm closing the
    // application.
    e.returnValue = false // equivalent to `return false` but not recommended
    window.hide()
  }

  window.on('closed', (event) => {
    console.log('UI.toolbox.closed')
    window = null
  })

  window.webContents.on('new-window', event => {
    // console.log("UI.toolbox.new-window");
    // event.preventDefault();
    return
  })

  // Window events
  // -------------------------------------------------------------------------------- //
  window.on('blur', function (e) {
    console.log('win.blur')
  })

  window.on('focus', function (e) {
    console.log('win.focus')
  })

  window.on('maximize', function (e) {
    console.log('win.maximize')
  })

  window.on('unmaximize', function (e) {
    console.log('win.unmaximize')
  })

  window.on('minimize', function (e) {
    console.log('win.minimize')
  })

  window.on('restore', function (e) {
    console.log('win.restore')
  })

  window.on('enter-full-screen', function (e) {
    console.log('win.enter-full-screen')
  })

  window.on('leave-full-screen', function (e) {
    console.log('win.leave-full-screen')
  })

  window.on('resize', function (e) {
    // console.log($(window).width());
    // win.getBounds()
    console.log('win.resize-event')
  })

  window.on('move', function (e) {
    // console.log($(window).width());
    console.log('win.move-event')
  })

  window.on('show', function (e) {
    // console.log($(window).width());
    console.log('win.show')
  })

  window.on('hide', function (e) {
    // console.log($(window).width());
    console.log('win.hide')
  })

  // Register a global shortcut to toggle the window
  globalShortcut.register('control+Space', () => {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
    }
  });

  return window

}


// IPC events
// -------------------------------------------------------------------------------- //
ipcMain.on('toolbox.dock', () => dock())
ipcMain.on('toolbox.undock', () => undock())

ipcMain.on('toolbox.show', () => show())
ipcMain.on('toolbox.hide', () => hide())

ipcMain.on('toolbox.minimize', () => minimize())
ipcMain.on('toolbox.maximize', () => maximize())
ipcMain.on('toolbox.restore', () => restore())

ipcMain.on('toolbox.resize', (event, arg) => resize(arg))

// Functions
// -------------------------------------------------------------------------------- //
function dock() {
  console.log('UI.toolbox.dock()')
  return true
}

function undock() {
  console.log('UI.toolbox.undock()')
  return true
}

function show() {
  console.log('UI.toolbox.show()')
  if (!window.isVisible()) {
    window.show()
  }
}

function hide() {
  console.log('UI.toolbox.hide()')
  if (window.isVisible()) {
    window.hide()
  }
}

function minimize() {
  console.log('UI.toolbox.minimize()')
  return true
}

function maximize() {
  console.log('UI.toolbox.maximize()')
  return true
}

function restore() {
  console.log('UI.toolbox.restore()')
  return true
}

function resize(arg) {
  console.log('UI.toolbox.resize()')
  window.hide()
  wm.resize(window, arg[0], arg[1], true)
  wm.align(window, config.align, config.alignOffset)
  window.show()
}

function toggle() {
  console.log('UI.toolbox.toggle()')
  window.isVisible() ? window.hide() : window.show()
}

// Exports
module.exports = {
  init,
  toggle
}
