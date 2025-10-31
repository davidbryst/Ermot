const { BrowserWindow, Menu } = require('electron');
const path = require('node:path');
const config = require('./config');

function createWindow() {
  const win = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    fullscreen: config.window.fullscreen,
    resizable: (typeof config.window.resizable !== 'undefined') ? !!config.window.resizable : true,
    maximizable: (typeof config.window.maximizable !== 'undefined') ? !!config.window.maximizable : true,
    icon: path.join(__dirname, '../../assets/icon.png'),
    // hide the native menu bar by default and prevent it from showing unless explicitly enabled
    autoHideMenuBar: true,
    title: config.window.title,
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  // Remove the application menu so the menu (File/Edit/View/Window/Help) is disabled
  try {
    Menu.setApplicationMenu(null);
  } catch (err) {
    // ignore if Menu APIs are not available in this context
  }

  // Ensure the menu bar is not visible (prevents Alt from showing on some platforms)
  try {
    win.setMenuBarVisibility(false);
  } catch (err) {
    // ignore if not supported
  }

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  return win;
}

module.exports = createWindow;
