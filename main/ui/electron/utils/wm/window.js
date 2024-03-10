'use strict'


const { 
    BrowserWindow,
    screen,
    display
}                   = require('electron')


/*
BrowserWindow :: options
On Linux, possible types are desktop, dock, toolbar, splash, notification.
- The desktop type places the window at the desktop background window level 
  (kCGDesktopWindowLevel - 1). However, note that a desktop window will not receive 
  focus, keyboard, or mouse events. You can still use globalShortcut to receive 
  input sparingly.
- The dock type creates a dock-like window behavior.
- The toolbar type creates a window with a toolbar appearance.
- The splash type behaves in a specific way. It is not draggable, even if the CSS 
  styling of the window's body contains -webkit-app-region: drag. This type is commonly 
  used for splash screens.        
- The notification type creates a window that behaves like a system notification.    
*/

class Window extends BrowserWindow {

    constructor(config = {}) {
        super(config)
        this.name = config.name || this.id
        this.isDocked = config.docked || false        
    }

    /**
     * Utility method for window resize
     * @param {number|string} width in px, strings/negative numbers "+num", "-num" treated as offsets
     * @param {number|string} height in px, strings/negative numbers "+num", "-num" treated as offsets
     * @param {boolean} animate
     */
    resize (width, height, animate = true) {

        let display = screen.getPrimaryDisplay() // TODO: Fix
        var [wW, wH] = this.getSize()
        var [newW, newH] = [wW, wH]

        // This is ugly as hell >> TODO Rewrite
        if (typeof width === 'string') {
          if (width.includes('%')) {
            // String treated as %
            newW = Math.round(display.workAreaSize.width * parseInt(width.substring(0, width.length - 1))) / 100 // TODO: Assert             
          } else if (width[0] === '+') {
            // String treated as offset
            newW = wW + parseInt(width.substring(1))
          } else if (width[0] === '-') {
            // String treated as offset
            newW = wW - parseInt(width.substring(1))
          } else {
            // Try to get a number from what we got
            newW = parseInt(width)
          }
        } else if (typeof width === 'number') {
          // Negative number treated as offset
          if (width < 0) {
            newW = wW - width
          } else {
            newW = width
          }
        }
      
        if (typeof height === 'string') {
          if (height.includes('%')) {
            // String treated as %
            newH = Math.round(display.workAreaSize.height * parseInt(height.substring(0, height.length - 1))) / 100 // TODO: Assert
          } else if (height[0] === '+') {
            newH = wW + parseInt(height.substring(1))
          } else if (height[0] === '-') {
            newH = wW - parseInt(height.substring(1))
          } else {
            newH = parseInt(height)
          }
        } else if (typeof height === 'number') {
          // Negative number treated as offset
          if (height < 0) {
            newH = wW - height
          } else {
            newH = height
          }
        }
      
        if (newW > 0 && newH > 0) {
          this.setSize(newW, newH, animate)
        }
    }

    /**
     * Utility method for window placement
     * @param {string} position Accepted values "top", "bottom", "left", "right", "topLeft", "topRight", "bottomLeft", "bottomRight", "center"
     * @param {number} offsetX X Offset in px from the edge of the screen deppending on the alligned position
     * @param {number} offsetY Y Offset in px from the edge of the screen deppending on the alligned position
     */
    align (position, offsetX = 0, offsetY = 0, relative = true) {

        if (typeof position !== 'string') {
            console.log('Expecting a string as the possition input parameter')
            return false
        }

        let display = screen.getPrimaryDisplay() // TODO: Handle multiple displays
        var [wW, wH] = this.getSize()
        var [wX, wY] = this.getPosition()
    
        console.log(this.getSize())
        console.log(display.workAreaSize)

        switch (position) {

        case 'top':
            this.setPosition(wX + offsetX, 0 + offsetY)
            break
        case 'bottom':
            this.setPosition(wX + offsetX, display.workAreaSize.height - wH - offsetY)
            break
        case 'left':
            this.setPosition(0 + offsetX, wY + offsetY)
            break
        case 'right':
            this.setPosition(display.workAreaSize.width - wW - offsetX, wY + offsetY)
            break
        case 'topLeft':
            this.setPosition(0 + offsetX, 0 + offsetY)
            break
        case 'topRight':
            this.setPosition(display.workAreaSize.width - wW - offsetX, 0 + offsetY)
            break
        case 'bottomLeft':
            this.setPosition(0 + offsetX, display.workAreaSize.height - wH - offsetY)
            break
        case 'bottomRight':
            this.setPosition(display.workAreaSize.width - wW - offsetX, display.workAreaSize.height - wH - offsetY)
            break
        case 'center':
            this.center()
            break
        default:
            console.log('Align to ' + position + ' not defined')
            return false
        }

        return true

    }

    save() {
        console.log('window.save()')
        return true
    }

    restore () {
        console.log('window.restore()')
        return true
    }

    tmpResize (arg) {
        console.log('window.resize()')
        this.hide()
        this.resize(window, arg[0], arg[1], true)
        this.align(window, config.align, config.alignOffset)
        this.show()
    }

    toggle () {
        console.log('window.toggle()')
        this.isVisible() ? this.hide() : this.show()
    }

}


module.exports = Window
