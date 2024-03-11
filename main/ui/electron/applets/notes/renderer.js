const { ipcRenderer } = require('electron');

ipcRenderer.on('new-note', (event) => {
  // Logic to create a new note goes here
});

ipcRenderer.on('load-note', (event, data) => {
  // Logic to load a note's data goes here
});

ipcRenderer.on('save-note', (event) => {
  // Logic to save the current note goes here
});
