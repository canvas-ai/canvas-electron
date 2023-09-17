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


/**
 * Tray configuration
 */

class CanvasTray extends Tray {


  constructor(options) {

    options = {
      title: 'Tray',
      icon: path.resolve(__dirname, '../../../assets/logo_1024x1024.png'),
      ...options
    }

    super(options.icon)
    this.title = options.title

    // https://github.com/electron/electron/issues/28131
    this.setToolTip(options.title)
    this.setTitle(options.title)

    this.#updateTrayMenu()
    this.setIgnoreDoubleClickEvents(true)

  }



/**
 * Canvas Tray Menu
 * ---
 * - Context
 * -- {}
 * - Toolbox
 * - Canvas
 * ---
 * - Workspaces
 * -- {}
 * ---
 * - Apps
 * - Roles
 * - Services
 * ---
 * - Identities
 * - Peers
 * ---
 * - Settings
 * - About
 * - Quit
 */

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

    menu.append(new MenuItem({ label: this.title, enabled: false }))
    menu.append(new MenuItem({ type: 'separator' }))
    menu.append(
      new MenuItem({
        label: 'Toolbox',
        click() { app.toolbox.toggle() }
      })
    )

    menu.append(new MenuItem({ type: 'separator' }))
    menu.append(
      new MenuItem({
        label: 'Setings',
        click() {
          log('Settings window')
        }
      })
    )

    menu.append(
      new MenuItem({
        label: 'About',
        click() { app.showAboutPanel() },
        role: 'about'
      })
    )

    menu.append(new MenuItem({ type: 'separator' }))
    menu.append(
      new MenuItem({
        label: 'Exit',
        click() {
          console.log('Exit from tray')
          app.isQuitting = true
          console.log(app.quit())
          process.exit(0)
        },
        accelerator: 'Command+Q'
      })
    )

    this.setContextMenu(menu)

  }

}


module.exports = CanvasTray