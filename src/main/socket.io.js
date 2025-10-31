const { MessageChannelMain } = require('electron');
const robot = require('robotjs');
const http = require('http');
const socketIo = require('socket.io');
const loudness = require('loudness');
const config = require('./config');
const remoteControl = require('./remoteControl');
const logger = require('./logger');

/**
 * Initialise le volume par défaut au démarrage
 * @param {BrowserWindow} win - La fenêtre Electron principale
 */
async function initializeVolume(win) {
  try {
    // await loudness.setVolume(config.volume.default);
  const currentVolume = await loudness.getVolume();
  logger.info(`[socket.io] Initial volume: ${currentVolume}%`);

    // Attendre un peu pour s'assurer que les listeners du renderer sont prêts
    setTimeout(() => {
      // Envoyer le volume initial à l'interface
      if (win && win.webContents) {
        const { port1 } = new MessageChannelMain();
  win.webContents.postMessage('volume', { data: currentVolume }, [port1]);
  logger.info(`[socket.io] Initial volume posted to renderer: ${currentVolume}%`);
      }
    }, 100);
  } catch (error) {
    logger.error(`[socket.io] Error initializing volume: ${error && error.message ? error.message : error}`);
  }
}

/**
 * Surveille les changements de volume du système
 * @param {BrowserWindow} win - La fenêtre Electron principale
 * @param {Server} io - Instance Socket.IO pour notifier les clients
 */
function watchVolumeChanges(win, io) {
  let lastVolume = null;

  // Vérifier le volume selon l'intervalle configuré
  const volumeCheckInterval = setInterval(async () => {
    try {
      const currentVolume = await loudness.getVolume();

      // Si le volume a changé
      if (lastVolume !== null && currentVolume !== lastVolume) {
        logger.info(`[socket.io] Volume changed: ${lastVolume}% -> ${currentVolume}%`);

        // Mettre à jour l'interface Electron
        if (win && win.webContents) {
          const { port1 } = new MessageChannelMain();
          win.webContents.postMessage('volume', { data: currentVolume }, [port1]);
        }

        // Notifier tous les clients Socket.IO connectés
        if (io) {
          io.emit('volumeActuel', { data: currentVolume });
        }
      }

      lastVolume = currentVolume;
    } catch (error) {
      logger.error(`[socket.io] Error watching volume: ${error && error.message ? error.message : error}`);
    }
  }, config.volume.watchInterval);

  // Nettoyer l'intervalle quand la fenêtre est fermée
  if (win) {
    win.on('closed', () => {
      clearInterval(volumeCheckInterval);
      logger.info('[socket.io] Volume watch stopped');
    });
  }

  return volumeCheckInterval;
}

/**
 * Démarre le serveur Socket.IO
 * @param {BrowserWindow} win - La fenêtre Electron principale
 * @returns {Server} - L'instance du serveur Socket.IO
 */
function startSocketServer(win) {
  // Initialiser le volume au démarrage avec la fenêtre
  initializeVolume(win);

  const server = http.createServer();
  const io = socketIo(server, {
    cors: config.socket.cors
  });

  // Démarrer la surveillance du volume système
  watchVolumeChanges(win, io);

  io.on('connection', async (socket) => {
    const { port1 } = new MessageChannelMain();
    const message = `${config.messages.socket.clientConnected} ${socket.id}`;

    win.webContents.postMessage('state', {
      state: { type: 'client', color: 'green', socket: socket.id },
      message
    }, [port1]);

  logger.info(`[socket.io] ${message}`);

    // Envoyer le volume actuel au client qui vient de se connecter
    try {
      const currentVolume = await loudness.getVolume();
      socket.emit('volumeActuel', { data: currentVolume });
    } catch (error) {
      logger.error(`[socket.io] Error getting current volume: ${error && error.message ? error.message : error}`);
    }

    /**
     * Gestionnaire pour obtenir le volume actuel
     */
    socket.on('obtenirVolume', async () => {
      try {
        const currentVolume = await loudness.getVolume();
  socket.emit('volumeActuel', { data: currentVolume });
  logger.info(`[socket.io] Current volume sent to client: ${currentVolume}%`);
      } catch (error) {
        console.error('Erreur lors de la récupération du volume:', error);
      }
    });

    /**
     * Gestionnaire de changement de volume
     */
    socket.on('changerVolume', async (data) => {
      try {
        let requestedVolume = null;

        // Parse les différents formats de données possibles
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            requestedVolume = typeof parsed === 'number' ? parsed : parsed?.data;
          } catch (e) {
            logger.error(`[socket.io] JSON parse error for volume: ${e && e.message ? e.message : e}`);
            return;
          }
        } else if (typeof data === 'number') {
          requestedVolume = data;
        } else if (data && typeof data === 'object') {
          requestedVolume = data.data;
        }

        // Valide le volume
        if (typeof requestedVolume !== 'number' || Number.isNaN(requestedVolume)) {
          logger.warn('[socket.io] Invalid volume received: ' + JSON.stringify(data));
          return;
        }

        // Limite le volume entre min et max
        const clamped = Math.max(
          config.volume.min,
          Math.min(config.volume.max, Math.round(requestedVolume))
        );

        // Met à jour le volume système
        await loudness.setVolume(clamped);

        // Notifie l'interface
        const { port1 } = new MessageChannelMain();
        win.webContents.postMessage('volume', { data: clamped }, [port1]);

        logger.info(`[socket.io] ${config.messages.volume.changed} ${clamped}%`);
      } catch (error) {
        logger.error(`[socket.io] ${config.messages.volume.error}: ${error && error.message ? error.message : error}`);
      }
    });


    /**
     * === CONTRÔLE SOURIS ===
     */
    socket.on('souris:deplacer', (data) => {
      try {
        const { x, y } = data;
        const result = remoteControl.mouse.move(x, y);
        // notifier l'interface (renderer) avec la position absolue
        if (win && win.webContents && result && result.position) {
          const { port1 } = new MessageChannelMain();
          win.webContents.postMessage('mouse', { action: 'mouse-move', x: result.position.x, y: result.position.y }, [port1]);
        }
        socket.emit('souris:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Mouse move error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('souris:clic', (data) => {
      try {
        const { button } = data;
        const result = remoteControl.mouse.click(button);
        // position courante de la souris
        const pos = robot.getMousePos();
        if (win && win.webContents) {
          const { port1 } = new MessageChannelMain();
          win.webContents.postMessage('mouse', { action: 'mouse-click', button, x: pos.x, y: pos.y }, [port1]);
        }
        socket.emit('souris:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Mouse click error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('souris:doubleClic', () => {
      try {
        const result = remoteControl.mouse.doubleClick();
        const pos = robot.getMousePos();
        if (win && win.webContents) {
          const { port1 } = new MessageChannelMain();
          win.webContents.postMessage('mouse', { action: 'mouse-click', button: 'left', double: true, x: pos.x, y: pos.y }, [port1]);
        }
        socket.emit('souris:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Double-click error: ${error && error.message ? error.message : error}`);
      }
    });

    /**
     * === CONTRÔLE CLAVIER ===
     */
    socket.on('clavier:ecrire', (data) => {
      try {
        const { text } = data;
        const result = remoteControl.keyboard.type(text);
        socket.emit('clavier:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Keyboard type error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('clavier:touche', (data) => {
      try {
        const { key, modifiers } = data;
        const result = remoteControl.keyboard.press(key, modifiers || []);
        socket.emit('clavier:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Key press error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('clavier:raccourci', (data) => {
      try {
        const { action } = data;
        if (remoteControl.keyboard.shortcuts[action]) {
          const result = remoteControl.keyboard.shortcuts[action]();
          socket.emit('clavier:resultat', result);
        }
      } catch (error) {
        logger.error(`[socket.io] Shortcut error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('clavier:recupererTexte', () => {
      try {
        logger.info('[socket.io] Request to retrieve clipboard text');
        const text = remoteControl.keyboard.getClipboard();
        logger.info(`[socket.io] Clipboard text length: ${text ? text.length : 0}`);
        socket.emit('clavier:texteRecupere', { text });
      } catch (error) {
        logger.error(`[socket.io] Clipboard retrieval error: ${error && error.message ? error.message : error}`);
        socket.emit('clavier:texteRecupere', { text: '', error: error.message });
      }
    });

    /**
     * === CONTRÔLE MULTIMÉDIA ===
     */
    socket.on('media:lecture', () => {
      try {
        const result = remoteControl.media.playPause();
        socket.emit('media:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Media play error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('media:suivant', () => {
      try {
        const result = remoteControl.media.next();
        socket.emit('media:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Media next error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('media:precedent', () => {
      try {
        const result = remoteControl.media.previous();
        socket.emit('media:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Media previous error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('media:reculer10', () => {
      try {
        const result = remoteControl.media.skipBackward(10);
        socket.emit('media:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Media skip backward error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('media:avancer10', () => {
      try {
        const result = remoteControl.media.skipForward(10);
        socket.emit('media:resultat', result);
      } catch (error) {
        logger.error(`[socket.io] Media skip forward error: ${error && error.message ? error.message : error}`);
      }
    });

    /**
     * === CONTRÔLE SYSTÈME ===
     */
    socket.on('systeme:verrouiller', () => {
      try {
        const result = remoteControl.system.lock();
        socket.emit('systeme:resultat', result);
        logger.info('[socket.io] System locked');
      } catch (error) {
        logger.error(`[socket.io] System lock error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('systeme:veille', () => {
      try {
        const result = remoteControl.system.sleep();
        socket.emit('systeme:resultat', result);
        logger.info('[socket.io] System sleep');
      } catch (error) {
        logger.error(`[socket.io] System sleep error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('systeme:redemarrer', () => {
      try {
        const result = remoteControl.system.restart();
        socket.emit('systeme:resultat', result);
        logger.info('[socket.io] System restart');
      } catch (error) {
        logger.error(`[socket.io] System restart error: ${error && error.message ? error.message : error}`);
      }
    });

    socket.on('systeme:eteindre', () => {
      try {
        const result = remoteControl.system.shutdown();
        socket.emit('systeme:resultat', result);
        logger.info('[socket.io] System shutdown');
      } catch (error) {
        logger.error(`[socket.io] System shutdown error: ${error && error.message ? error.message : error}`);
      }
    });

    /**
     * Gestionnaire de déconnexion
     */
    socket.on('disconnect', () => {
      logger.info(`[socket.io] ${config.messages.socket.clientDisconnected}: ${socket.id}`);
    });
  });

  // Démarre le serveur
  server.listen(config.socket.port, config.socket.host, () => {
    const { port1 } = new MessageChannelMain();
    win.webContents.postMessage('state', {
      state: { type: 'socket.io', color: 'green' },
      message: config.messages.socket.started
    }, [port1]);

    logger.info(`[socket.io] Socket.IO server started at http://${config.socket.host}:${config.socket.port}`);
  });

  return io;
}


module.exports = startSocketServer;
