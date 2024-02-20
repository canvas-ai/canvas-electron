// Import required modules
const { app, BrowserWindow, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

// Define mainWindow
let mainWindow = null;

app.on('ready', function() {
  // Create new browser window
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Load Editor.js
  mainWindow.loadURL(path.join(__dirname, 'frontend', 'index.html'));

  // Define application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          click: () => {
            mainWindow.webContents.send('new-note');
          },
        },
        {
          label: 'Open Note',
          click: () => {
            dialog.showOpenDialog({ properties: ['openFile'] }).then(result => {
              if (!result.canceled) {
                fs.readFile(result.filePaths[0], 'utf-8', (err, data) => {
                  if (err) {
                    console.error('An error occurred reading the file:', err);
                    return;
                  }

                  mainWindow.webContents.send('load-note', JSON.parse(data));
                });
              }
            });
          },
        },
        {
          label: 'Save Note',
          click: () => {
            mainWindow.webContents.send('save-note');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.webContents.openDevTools();

});

app.on('window-all-closed', function() {
  app.quit();
});

app.on('activate', function() {
  if (mainWindow === null) createWindow();

});
