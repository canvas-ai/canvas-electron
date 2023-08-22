

function genWsMenu(menu) {

    menu.append( new MenuItem({label: 'CanvasUI Workspaces', enabled: false }) )
    menu.append( new MenuItem({type: 'separator'}) )

    Object.values(ws.list()).forEach((v) => {
      menu.append(
        new MenuItem({
            label: (v.status === 'open'|| v.status === 'active') ? `${v.name} «` : v.name,
            id: v.name,
            enabled: (v.status === 'open' || v.status === 'available' || v.status === 'active'),
            type: 'radio',
            checked: (v.status === 'active'),
            click() { ws.enterByID(v.id) }
        })
      )
    })

    menu.append( new MenuItem({type: 'separator'}) )

  }


  function genPeerMenu(menu, peers = {}) {

    let submenu = []

    Object.values(peers).forEach((p) => {
      submenu.push(
        new MenuItem({
            label: `${p.hostname} (${p.id})`,
            id: p.id,
            enabled: true,
            click() {
              app.testOpen(`http://${p.ip}:3000/`)
              //shell.openExternal(`http://${p.ip}:3000/`)
            }
        })
      )
    })

    menu.append(
      new MenuItem({
        label: 'Peers',
        submenu: submenu
      })
    )

  }

  function genAppsMenu(menu) {

    let submenu = []

    for (let [name, cfg] of Object.entries(apps.list())) {
      submenu.push(
        new MenuItem({
            label: `${name} (${cfg.type})`,
            id: name,
            enabled: true,
            click() {
              if (cfg.type === 'external') apps.run(name)
              if (cfg.type === 'web') shell.openExternal(cfg.parms.location)
              else log('nemame zatial')
            }
        })
      )
    }

    menu.append(
      new MenuItem({
        label: 'Apps',
        submenu: submenu
      })
    )

  }

  function setupRoleEventListeners() {}
  function genRolesMenu(menu) {

    let submenu = []
    menu.append(
      new MenuItem({
        label: 'Roles',
        submenu: submenu
      })
    )

  }

  function setupWsEventListeners() {

    let wsRebuildEvents = [
      'create',
      'remove',
      'destroy',
      'open',
      'close',
      'enter',
      'not available'
    ]

    ws.onAny((e, val) => {
      notify.info(e, JSON.stringify(val))
      if (wsRebuildEvents.includes(e)) updateTrayMenu()
    })

  }



  function setupPeerEventListeners() {

    let peerRebuildEvents = [
      'connect',
      'disconnect',
      'add',
      'remove',
      'ban',
      'unban'
    ]

    peer.on('found', (p) => {
      notify.info(`Peer ${p.hostname} (${p.id}) connected`, '')
      updateTrayMenu()
    })

    peer.on('lost', (p) => {
      notify.info(`Peer ${p.hostname} (${p.id}) disconnected`, '')
      updateTrayMenu()
    })

    peer.on('roleAdded', (p, role) => {
      notify.info(`Role ${role.name} found on peer ${p.hostname}`, `Host: ${role.host} \nPort: ${role.port}\n URL: ${role.url}`)
    })

    peer.on('roleRemoved', (p, role) => {
      notify.info(`Role ${role.name} removed from peer ${p.hostname}`, '')
    })

  }
