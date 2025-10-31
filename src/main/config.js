/**
 * Configuration centrale de l'application
 */

module.exports = {
  // Configuration de la fenêtre principale
  window: {
    // Taille par défaut réduite pour mieux s'adapter aux écrans plus petits
    // Anciennement : 16*80 x 9*80 (1280x720)
    width: 1000,
    height: 600,
    title: 'Ermot',
    // Si true, la fenêtre s'ouvrira en plein écran
    fullscreen: false,
    // Empêche le redimensionnement par l'utilisateur
    resizable: false,
    // Empêche la maximisation (optionnel — utile pour verrouiller la taille)
    maximizable: false
  },

  // Auto-launch (démarrage automatique à l'ouverture de session)
  // Si true, l'application s'enregistrera pour s'exécuter automatiquement
  // au démarrage de la session utilisateur. Peut être modifié par l'utilisateur.
  autoLaunch: {
    enabled: true
  },

  // Logging configuration
  logging: {
    // If true, suppress info/debug logs produced by the app (keep warnings/errors).
    // Useful to only see the external startup lines (electron-forge) in the console.
    minimal: true
  },


  // Configuration du serveur Socket.IO
  socket: {
    port: 9000,
    host: '0.0.0.0',
    cors: {
      origin: '*'
    }
  },

  // Configuration du serveur web mobile
  mobileServer: {
    port: 8080,
    enabled: true, // Mettre à false pour désactiver
    // Active le HTTPS pour autoriser l'accès caméra sur mobile (conseillé)
    useHttps: false,
    // Chemins des certificats si HTTPS activé (PEM)
    https: {
      keyPath: '',
      certPath: ''
    }
  },

  // Configuration du volume par défaut
  volume: {
    default: 50,
    min: 0,
    max: 100,
    watchInterval: 500 // Intervalle de surveillance en millisecondes
  },

  // Messages de statut
  messages: {
    app: {
      started: "L'application a démarré correctement"
    },
    socket: {
      started: "Le serveur Socket.IO a démarré correctement",
      clientConnected: "Un client est connecté via Socket.IO",
      clientDisconnected: "Client déconnecté"
    },
    volume: {
      changed: "Volume modifié à",
      error: "Erreur lors du réglage du volume"
    }
  }
};

