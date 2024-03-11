ipcMain.on('app.quit', () => {
    log.info('electron.ipc > app.quit()')
    app.isQuitting = true
    app.quit()
})

ipcMain.on('app.relaunch', () => {
    log.info('electron.ipc > app.relaunch()')
    app.isQuitting = true
    app.relaunch()
    app.quit()
})

ipcMain.on('app.about', () => {
    log.info('electron.ipc > app.about()')
    app.showAboutPanel()
})
