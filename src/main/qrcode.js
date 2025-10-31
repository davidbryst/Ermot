const QRCode = require('qrcode');
const os = require('os');
const { MessageChannelMain } = require('electron');
const config = require('./config');
const sessionManager = require('./sessionManager');
const logger = require('./logger');

/**
 * Obtient l'adresse IP locale de la machine
 * @returns {string} Adresse IP locale
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  logger.info('[qrcode] Interfaces reseau disponibles:', Object.keys(interfaces));

  // Ordre de preference des interfaces reseau
  const preferredInterfaces = ['Wi-Fi', 'Ethernet', 'wlan0', 'eth0', 'en0'];

  // D'abord essayer les interfaces préférées
  for (const preferred of preferredInterfaces) {
    const iface = interfaces[preferred];
    if (iface) {
  logger.info(`[qrcode] Verification de l'interface ${preferred}:`, iface);
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          logger.info(`[qrcode] IP trouvee sur ${preferred}:`, addr.address);
          return addr.address;
        }
      }
    }
  }

  // Si aucune interface préférée n'est trouvée, essayer toutes les autres
  for (const name of Object.keys(interfaces)) {
  logger.info(`[qrcode] Verification de l'interface ${name}:`, interfaces[name]);
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
  logger.info(`[qrcode] IP trouvee sur ${name}:`, iface.address);
        return iface.address;
      }
    }
  }

  logger.info('[qrcode] Aucune IP locale trouvee, utilisation de localhost');
  return 'localhost';
}

/**
 * Génère les informations de connexion
 * @returns {Object} Informations de connexion
 */
function getConnectionInfo() {
  const ip = getLocalIP();
  const port = config.socket.port;
  const url = `http://${ip}:${port}`;

  return {
    ip,
    port,
    url,
    hostname: os.hostname()
  };
}

/**
 * Génère un QR code contenant l'URL de connexion
 * @param {number} mobilePort - Port du serveur web mobile
 * @returns {Promise<Object>} Objet contenant le QR code et les infos
 */
async function generateQRCode(mobilePort = 8080) {
  try {
    const info = getConnectionInfo();
    const ip = getLocalIP();
    const protocol = config.mobileServer && config.mobileServer.useHttps ? 'https' : 'http';
    const mobileUrl = `${protocol}://${ip}:${mobilePort}`;

    // URL avec connexion directe au serveur Socket.IO
    const code = 'DIRECT';
    const mobileClientUrl = `${mobileUrl}/mobile-client.html?server=${encodeURIComponent(info.url)}`;

    // Le QR code contient l'URL avec le code court
    const qrData = mobileClientUrl;

    // Générer le QR code en data URL avec des paramètres optimisés
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      type: 'image/png'
    });

    return {
      qrCode: qrCodeDataURL,
      code,
      mobileUrl: mobileClientUrl,
      serverUrl: info.url
    };
  } catch (error) {
    logger.error(`[qrcode] Error generating QR code: ${error && error.message ? error.message : error}`);
    throw error;
  }
}

/**
 * Envoie le QR code à l'interface renderer
 * @param {BrowserWindow} win - La fenêtre Electron
 * @param {number} mobilePort - Port du serveur web mobile
 */
async function sendQRCodeToRenderer(win, mobilePort = 8080) {
  try {
  logger.info('[qrcode] Generation du QR code en cours...');
    const qrCodeData = await generateQRCode(mobilePort);
    const info = getConnectionInfo();

  logger.info('[qrcode] QR Code genere avec succes');
  logger.info('[qrcode] Code de session:', qrCodeData.code);
  logger.info('[qrcode] URL Socket.IO:', qrCodeData.serverUrl);
  logger.info('[qrcode] URL Client Mobile:', qrCodeData.mobileUrl);
  logger.info('[qrcode] Hostname:', info.hostname);

    // Attendre que la fenêtre et les listeners soient prêts
    setTimeout(() => {
      if (win && win.webContents) {
  logger.info('[qrcode] Taille du QR code:', qrCodeData.qrCode.length, 'caracteres');
  logger.info('[qrcode] Debut du QR code:', qrCodeData.qrCode.substring(0, 50) + '...');

        const { port1 } = new MessageChannelMain();
        win.webContents.postMessage('qrcode', {
          qrCode: qrCodeData.qrCode,
          info,
          mobileUrl: qrCodeData.mobileUrl,
          code: qrCodeData.code
        }, [port1]);

  logger.info('[qrcode] QR Code envoye a l interface');
  logger.info('[qrcode] Donnees envoyees:', { hasQrCode: !!qrCodeData.qrCode, hasInfo: !!info, hasMobileUrl: !!qrCodeData.mobileUrl, hasCode: !!qrCodeData.code });
      } else {
        logger.error('[qrcode] Window not available to send QR code');
      }
    }, 800);
  } catch (error) {
    logger.error(`[qrcode] Error sending QR code to renderer: ${error && error.message ? error.message : error}`);
  }
}

module.exports = {
  getLocalIP,
  getConnectionInfo,
  generateQRCode,
  sendQRCodeToRenderer
};

