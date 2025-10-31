const path = require('path');

/**
 * Helper to enable/disable auto-launch (run at login) using Electron API.
 * Uses app.setLoginItemSettings under the hood (Windows/macOS/Linux support varies).
 */
function setAutoLaunch(app, opts = {}) {
  const { enabled = true, args = [], name } = opts;

  try {
    // On Windows the path should point to the exe; process.execPath is ok for packaged apps
    const appPath = process.execPath;

    // Prepare settings for Electron
    const settings = {
      openAtLogin: !!enabled,
      path: appPath,
      args: Array.isArray(args) ? args : [],
    };

    // For macOS we can set a name
    if (name && process.platform === 'darwin') settings.name = name;

    app.setLoginItemSettings(settings);

    try {
      const logger = require('./logger');
      logger.info(`[autoLaunch] setLoginItemSettings: openAtLogin=${settings.openAtLogin} path=${settings.path}`);
    } catch (e) {
      // Fallback to console if logger cannot be required
      console.log(`[autoLaunch] setLoginItemSettings: openAtLogin=${settings.openAtLogin} path=${settings.path}`);
    }
  } catch (err) {
    try {
      const logger = require('./logger');
      logger.error(`[autoLaunch] failed to set login item settings: ${err && err.message ? err.message : err}`);
    } catch (e) {
      console.error('[autoLaunch] failed to set login item settings:', err);
    }
  }
}

module.exports = { setAutoLaunch };
