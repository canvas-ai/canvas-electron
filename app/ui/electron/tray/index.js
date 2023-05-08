'use strict'


/**
 * ui \ electron \ tray
 */

const {
  app,
  Menu,
  MenuItem,
  Tray,
  shell
} = require('electron')


// Utils
const path = require('path')
const debug = require('debug')('ui-electron-tray')

// Canvas Utils
//const log = app.utils.logger('ui.tray')
//const config = app.utils.config('ui.tray')
//const notify = require('../utils/notifier')


/**
 * Tray configuration
 */

class CanvasTray extends Tray {

  #log = null
  #config = null

  constructor(options) {

    options = {
      title: 'Tray',
      icon: path.resolve(__dirname, '../../assets/nocoffee.png'),
      ...options
    }

    super(options.icon)

    /*this.#log = app.utils.logger('tray', {
      path: options.logPath
    })*/
    this.#config = {} //app.utils.config(options.configPath)
    this.title = options.title
/*
    if (this.#config.get('enableContext')) {
      // loading plugin
      let context = require('./plugins/context')
      // setup event listeners
    }

    if (this.#config.get('enableApps')) {
      // loading plugin
      let context = require('./plugins/context')
      // setup event listeners
    }

    if (this.#config.get('enableRoles')) {
      // loading plugin
      // setup event listeners
    }

    if (this.#config.get('enableServices')) {
      // loading plugin
      // setup event listeners
    }

    if (this.#config.get('enablePeers')) {
      // loading plugin
      // setup event listeners
    }*/

    // https://github.com/electron/electron/issues/28131
    this.setToolTip(options.title)
    this.setTitle(options.title)

    this.#updateTrayMenu()
    this.setIgnoreDoubleClickEvents(true)

  }

  #updateTrayMenu() {

    debug('Updating tray menu')

    this.setContextMenu(null)
    let menu = new Menu()

    /*
    if (hasWorkspaces) genWsMenu(menu)
    if (hasApps) genAppsMenu(menu)
    if (hasRoles) genRolesMenu(menu)
    if (hasPeers) genPeerMenu(menu)
    */

    menu.append( new MenuItem({ label: this.title, enabled: false }) )
    menu.append( new MenuItem({ type: 'separator' }) )
    menu.append(
      new MenuItem({ label:'Toolbox',
        click() { app.toolbox.toggle() }
      })
    )

    menu.append( new MenuItem({ type: 'separator' }) )
    menu.append(
      new MenuItem({ label:'Setings',
        click() {
          log('Settings window')
        }
      })
    )

    menu.append(
      new MenuItem({ label:'About',
        click() { app.showAboutPanel() },
        role: 'about'
      })
    )

    menu.append( new MenuItem({type: 'separator'}) )
    menu.append(
      new MenuItem({ label:'Exit',
        click() {
          app.isQuitting = true
          app.quit()
        },
        accelerator: 'Command+Q'
      })
    )

    this.setContextMenu(menu)

  }

}


module.exports = CanvasTray
