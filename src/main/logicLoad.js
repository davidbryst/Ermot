const createWindow = require('./mainWindow');
const startSocketServer = require('./socket.io');
const { MessageChannelMain } = require('electron');
const config = require('./config');
const { sendQRCodeToRenderer } = require('./qrcode');
const { startMobileServer } = require('./mobileServer');

function all() {
  const win = createWindow();

  win.webContents.on('did-finish-load', () => {
    const { port1 } = new MessageChannelMain();
    win.webContents.postMessage('state', {
      state: { type: 'server', color: 'green' },
      message: config.messages.app.started
    }, [port1]);

    startSocketServer(win);

    // Démarrer le serveur web mobile si activé
    if (config.mobileServer.enabled) {
      startMobileServer(config.mobileServer.port, win);
    }

    // Générer et envoyer le QR code avec le port du serveur mobile
    sendQRCodeToRenderer(win, config.mobileServer.port);
  });
}

module.exports = all;
