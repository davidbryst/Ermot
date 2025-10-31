const { app, BrowserWindow } = require('electron');
const initialize = require('./src/main/logicLoad');
const config = require('./src/main/config');
const { setAutoLaunch } = require('./src/main/autoLaunch');
const logger = require('./src/main/logger');

/**
 * Point d'entrée principal de l'application Electron
 */

// Initialise l'application quand elle est prête
app.whenReady().then(() => {
  // Register auto-launch at login if enabled in config
  try {
    if (config && config.autoLaunch && config.autoLaunch.enabled) {
      setAutoLaunch(app, { enabled: true, name: config.window && config.window.title ? config.window.title : 'Ermot' });
      logger.info('[main] Auto-launch set to enabled');
    }
  } catch (err) {
    logger.error('Error configuring auto-launch:', err);
  }

  initialize();

  // Sur macOS, recréer une fenêtre quand l'icône du dock est cliquée
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      initialize();
    }
  });
});

// Quitter quand toutes les fenêtres sont fermées (sauf sur macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
