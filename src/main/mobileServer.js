const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getLocalIP } = require('./qrcode');
const config = require('./config');
const sessionManager = require('./sessionManager');
const logger = require('./logger');

/**
 * Démarre le serveur web pour le client mobile
 * @param {number} port - Port du serveur (défaut: 8080)
 * @param {BrowserWindow} win - Fenêtre Electron pour envoyer les notifications
 * @returns {Server} Instance du serveur HTTP
 */
function startMobileServer(port = 8080, win = null) {
  // Types MIME
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const requestHandler = (req, res) => {
  logger.info(`[Mobile Server] ${req.method} ${req.url}`);

    // Route API pour résoudre les codes de session - Vérification désactivée
    if (req.url.startsWith('/api/resolve?code=')) {
      const code = req.url.split('code=')[1];
      const info = require('./qrcode').getConnectionInfo();

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });

  logger.info('[Mobile Server] Connexion directe autorisee');
      res.end(JSON.stringify({
        success: true,
        serverUrl: info.url,
        code: 'DIRECT'
      }));
      return;
    }

    // Routing simple pour les fichiers statiques
    let filePath = req.url.split('?')[0]; // Ignorer les paramètres d'URL
    if (filePath === '/') {
      filePath = '/mobile-client.html';
    }

    // Résoudre le chemin absolu depuis la racine du projet
    const rootPath = path.resolve(__dirname, '..', '..');
    const resolvedPath = path.join(rootPath, filePath);

  logger.info('[Mobile Server] Chemin demande:', filePath);
  logger.info('[Mobile Server] Chemin racine:', rootPath);
  logger.info('[Mobile Server] Chemin resolu:', resolvedPath);
  logger.info('[Mobile Server] Fichier existe?:', fs.existsSync(resolvedPath));

    // Sécurité : empêcher l'accès aux fichiers en dehors du dossier
    if (!resolvedPath.startsWith(rootPath)) {
  logger.warn('[Mobile Server] Acces refuse (hors du dossier)');
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const extname = String(path.extname(resolvedPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(resolvedPath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404);
          res.end('404 - Fichier non trouvé');
        } else {
          res.writeHead(500);
          res.end('500 - Erreur serveur: ' + error.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  };

  let server;
  const useHttps = !!(config.mobileServer && config.mobileServer.useHttps);
  if (useHttps) {
    try {
      const keyPath = config.mobileServer.https && config.mobileServer.https.keyPath;
      const certPath = config.mobileServer.https && config.mobileServer.https.certPath;
      if (!keyPath || !certPath) {
        logger.warn('[Mobile Server] HTTPS enabled but keyPath/certPath missing. Falling back to HTTP.');
        server = http.createServer(requestHandler);
      } else {
        const options = {
          key: fs.readFileSync(path.resolve(keyPath)),
          cert: fs.readFileSync(path.resolve(certPath))
        };
        server = https.createServer(options, requestHandler);
      }
    } catch (e) {
      logger.error('[Mobile Server] HTTPS configuration error, falling back to HTTP: ' + (e && e.message ? e.message : e));
      server = http.createServer(requestHandler);
    }
  } else {
    server = http.createServer(requestHandler);
  }

  server.listen(port, '0.0.0.0', () => {
    const ip = getLocalIP();
    const protocol = (server instanceof https.Server) ? 'https' : 'http';
    const mobileUrl = `${protocol}://${ip}:${port}`;

  logger.info('\n[Mobile Server] Serveur client mobile demarre');
  logger.info('[Mobile Server] Local:   ', `${protocol}://localhost:${port}`);
  logger.info('[Mobile Server] Reseau:  ', mobileUrl);
  logger.info('[Mobile Server] Fichier: ', 'mobile-client.html\n');

    // Envoyer l'info à l'interface si disponible
    if (win && win.webContents) {
      setTimeout(() => {
        const { MessageChannelMain } = require('electron');
        const { port1 } = new MessageChannelMain();
        win.webContents.postMessage('mobile-server', {
          url: mobileUrl,
          port,
          status: 'running'
        }, [port1]);
      }, 600);
    }
  });

  // Gestion des erreurs
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error('[Mobile Server] Port ' + port + ' is already in use');
      logger.info('[Mobile Server] Try changing the port in src/main/config.js\n');
    } else {
      logger.error('[Mobile Server] Mobile server error: ' + (error && error.message ? error.message : error));
    }
  });

  return server;
}

module.exports = { startMobileServer };

