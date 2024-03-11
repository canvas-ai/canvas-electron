const { app } = require('electron');
const CustomTray = require('./testtray.js');
const path = require('path')

let myTray = null;

app.on('ready', () => {

    console.log('ready')

    const iconPath = path.resolve(__dirname, '../assets/logo_64x64.png');
    myTray = new CustomTray(iconPath);
    //myTray.displayMessage(); // Call a custom method
    myTray.on('click', () => {
        console.log('click')
        myTray.displayMessage()
    })
});
