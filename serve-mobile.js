#!/usr/bin/env node

/**
 * Serveur web simple pour héberger le client mobile
 * Usage: node serve-mobile.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.argv[2] || 8080;

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

/**
 * Obtient l'adresse IP locale
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Routing simple
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './mobile-client.html';
  }

  // Sécurité : empêcher l'accès aux fichiers en dehors du dossier
  const resolvedPath = path.resolve(filePath);
  const rootPath = path.resolve('.');

  if (!resolvedPath.startsWith(rootPath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
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
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  // Use the app logger if available, otherwise fallback to console
  try {
    const logger = require('./src/main/logger');
    logger.info('\n[serve-mobile] Serveur client mobile demarre');
    logger.info('[serve-mobile] Acces local:  ', `http://localhost:${PORT}`);
    logger.info('[serve-mobile] Acces mobile: ', `http://${ip}:${PORT}\n`);
    logger.info('[serve-mobile] Fichier servi:', 'mobile-client.html');
    logger.info('[serve-mobile] Ouvrez cette URL sur votre mobile pour vous connecter\n');
    logger.info('[serve-mobile] Appuyez sur Ctrl+C pour arreter le serveur\n');
  } catch (e) {
    console.log('\n[serve-mobile] Serveur client mobile demarre');
    console.log('[serve-mobile] Acces local:  ', `http://localhost:${PORT}`);
    console.log('[serve-mobile] Acces mobile: ', `http://${ip}:${PORT}\n`);
    console.log('[serve-mobile] Fichier servi:', 'mobile-client.html');
    console.log('[serve-mobile] Ouvrez cette URL sur votre mobile pour vous connecter\n');
    console.log('[serve-mobile] Appuyez sur Ctrl+C pour arreter le serveur\n');
  }
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  try {
    const logger = require('./src/main/logger');
    logger.info('\n\n[serve-mobile] Arret du serveur...');
    server.close(() => {
      logger.info('[serve-mobile] Serveur arrete\n');
      process.exit(0);
    });
  } catch (e) {
    console.log('\n\n[serve-mobile] Arret du serveur...');
    server.close(() => {
      console.log('[serve-mobile] Serveur arrete\n');
      process.exit(0);
    });
  }
});


