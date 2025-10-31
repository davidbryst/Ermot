/**
 * Script du processus de rendu pour l'application Ermot Server
 * Gère l'affichage de l'état du serveur et du volume en temps réel
 */

// Messages de statut pour l'interface
const MSG = {
  'green': 'Disponible',
  'red': 'Indisponible',
  'gray': 'Chargement',
};

// Configuration des couleurs Tailwind pour les différents états
const STATE_COLORS = {
  'green': {
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500'
  },
  'red': {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500'
  },
  'gray': {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    dot: 'bg-gray-500'
  }
};

/**
 * Génère le HTML pour afficher l'état d'un composant
 * @param {Object} params - Paramètres de l'état
 * @param {string} params.type - Type du composant (server, socket.io, client)
 * @param {string} params.color - Couleur de l'état (green, red, gray)
 * @param {string} [params.socket] - ID du socket si c'est un client
 * @returns {string} HTML du badge d'état
 */
function stateChange({type, color, socket = null}) {
  const colors = STATE_COLORS[color] || STATE_COLORS.gray;
  return `
    <span class="inline-flex mr-2 items-center ${colors.bg} ${colors.text} text-xs font-medium px-2.5 py-0.5 rounded-full">
      <span class="w-2 h-2 me-1 ${colors.dot} rounded-full"></span>
      ${MSG[color]}
    </span>
    ${type} ${type === 'client' ? socket : ''}
  `;
}

/**
 * Génère le HTML pour l'indicateur visuel de volume
 * @param {number} volume - Niveau de volume (0-100)
 * @returns {string} HTML des barres de volume
 */
function volumeChange(volume) {
  const bars = [];
  for (let i = 1; i <= 10; i++) {
    const threshold = i * 10;
    const colorClass = volume >= threshold ? 'bg-gradient-to-t from-red-500 to-orange-400' : 'bg-gray-300';
    const heightClass = volume >= threshold ? 'py-6' : 'py-6';
    const opacity = volume >= threshold ? 'opacity-100' : 'opacity-40';
    bars.push(`<span class="${colorClass} ${opacity} w-2 ${heightClass} rounded-full transition-all duration-300"></span>`);
  }
  return bars.join('\n    ');
}
/**
 * Écoute les changements d'état du serveur et met à jour l'interface
 */
window.api.onState((data) => {
  console.log('État reçu:', data);

  const element = document.getElementById(data.state.type);
  if (element) {
    element.innerHTML = stateChange(data.state);
  } else {
    console.warn(`Élément non trouvé pour le type: ${data.state.type}`);
  }
});

/**
 * Écoute les changements de volume et met à jour l'interface
 */
window.api.onVolume((data) => {
  console.log('Volume reçu:', data);

  const volumeText = document.getElementById('volume');
  const volumeVisual = document.getElementById('volumeS');

  if (volumeText) {
    volumeText.innerText = `${data.data}%`;
    // Animation de changement
    volumeText.style.transform = 'scale(1.1)';
    setTimeout(() => {
      volumeText.style.transform = 'scale(1)';
    }, 200);
  }

  if (volumeVisual) {
    volumeVisual.innerHTML = volumeChange(data.data);
  }
});

/**
 * Écoute la réception du QR code et l'affiche
 */
window.api.onQRCode((data) => {
  console.log('📥 QR Code reçu:', data);
  console.log('📦 Type de data.qrCode:', typeof data.qrCode);
  console.log('📏 Longueur de data.qrCode:', data.qrCode ? data.qrCode.length : 'undefined');

  const qrContainer = document.getElementById('qrcode-container');
  const serverUrl = document.getElementById('server-url');

  if (qrContainer && data.qrCode && data.qrCode.startsWith('data:image')) {
    console.log('✅ QR code valide détecté, affichage...');
    qrContainer.innerHTML = `
      <div class="flex flex-col items-center">
        <img
          src="${data.qrCode}"
          alt="QR Code de connexion Ermot Server"
          style="width: 300px; height: 300px; image-rendering: crisp-edges; display: block;"
          onload="console.log('✅ QR Code image chargée avec succès')"
          onerror="console.error('❌ Erreur de chargement du QR Code'); console.error('Src:', this.src.substring(0, 50));"
        >
      </div>
    `;
  } else {
    console.error('❌ QR code invalide ou manquant');
    console.error('data.qrCode existe?', !!data.qrCode);
    console.error('data.qrCode commence par data:image?', data.qrCode ? data.qrCode.startsWith('data:image') : 'N/A');
    if (qrContainer) {
      qrContainer.innerHTML = `
        <div class="text-red-500 text-center">
          <div class="text-4xl mb-2">❌</div>
          <div>Erreur de génération</div>
          <div class="text-xs mt-2">Vérifiez la console</div>
        </div>
      `;
    }
  }

  // Afficher le code de connexion
  const connectionCode = document.getElementById('connection-code');
  if (connectionCode && data.code) {
    connectionCode.innerText = data.code;
    console.log('🔑 Code de connexion affiché:', data.code);
  }

  // Afficher l'URL Socket.IO
  if (serverUrl && data.info) {
    serverUrl.innerText = data.info.url;
    console.log('📍 URL Socket.IO affichée:', data.info.url);
  } else if (serverUrl) {
    serverUrl.innerText = 'Erreur de connexion';
  }

  // Mettre à jour l'URL du client mobile
  const mobileServerInfo = document.getElementById('mobile-server-info');
  const mobileServerUrl = document.getElementById('mobile-server-url');

  if (data.mobileUrl && mobileServerInfo && mobileServerUrl) {
    mobileServerInfo.classList.remove('hidden');
    mobileServerUrl.innerText = data.mobileUrl;
    console.log('✅ URL complète du client mobile:', data.mobileUrl);
  }
});

/**
 * Écoute les informations du serveur mobile
 */
window.api.onMobileServer((data) => {
  console.log('📱 Serveur mobile démarré:', data);

  const mobileServerInfo = document.getElementById('mobile-server-info');
  const mobileServerUrl = document.getElementById('mobile-server-url');

  if (mobileServerInfo && mobileServerUrl && data.url) {
    mobileServerInfo.classList.remove('hidden');
    mobileServerUrl.innerText = data.url;
    console.log('✅ URL du serveur mobile affichée:', data.url);
  }
});

// ===== NOUVELLES FONCTIONNALITÉS AMÉLIORÉES =====

/**
 * Système de notifications
 */
function showNotification(message, type = 'info') {
  // Créer l'élément de notification
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;

  // Couleurs selon le type
  const colors = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  notification.className += ` ${colors[type] || colors.info}`;
  notification.textContent = message;

  // Ajouter au DOM
  document.body.appendChild(notification);

  // Animation d'entrée
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Supprimer après 3 secondes
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

/**
 * Initialise les fonctionnalités système
 */
function initSystemFeatures() {
  // Bouton Screenshot
  const screenshotBtn = document.querySelector('button[title="Prendre une capture d\'écran"]');
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', () => {
      // Animation de clic
      screenshotBtn.style.transform = 'scale(0.95)';
      setTimeout(() => screenshotBtn.style.transform = 'scale(1)', 150);

      // Envoyer commande screenshot via Socket.IO
      if (window.socket) {
        window.socket.emit('screenshot');
        showNotification('📸 Capture d\'écran prise !', 'success');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }

  // Bouton Clipboard
  const clipboardBtn = document.querySelector('button[title="Ouvrir le presse-papiers"]');
  if (clipboardBtn) {
    clipboardBtn.addEventListener('click', () => {
      clipboardBtn.style.transform = 'scale(0.95)';
      setTimeout(() => clipboardBtn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('clipboard:get');
        showNotification('📋 Presse-papiers ouvert !', 'info');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }

  // Bouton Apps
  const appsBtn = document.querySelector('button[title="Gérer les applications"]');
  if (appsBtn) {
    appsBtn.addEventListener('click', () => {
      appsBtn.style.transform = 'scale(0.95)';
      setTimeout(() => appsBtn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('apps:list');
        showNotification('📱 Applications chargées !', 'info');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }

  // Bouton Système
  const systemBtn = document.querySelector('button[title="Informations système"]');
  if (systemBtn) {
    systemBtn.addEventListener('click', () => {
      systemBtn.style.transform = 'scale(0.95)';
      setTimeout(() => systemBtn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('system:info');
        showNotification('💻 Informations système récupérées !', 'info');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }
}

/**
 * Initialise les contrôles volume avancés
 */
function initVolumeControls() {
  // Bouton Mute
  const muteBtn = document.querySelector('button[title="Couper le son"]');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      muteBtn.style.transform = 'scale(0.95)';
      setTimeout(() => muteBtn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('volume:mute');
        showNotification('🔇 Son coupé !', 'warning');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }

  // Bouton Volume 50%
  const volume50Btn = document.querySelector('button[title="Volume par défaut"]');
  if (volume50Btn) {
    volume50Btn.addEventListener('click', () => {
      volume50Btn.style.transform = 'scale(0.95)';
      setTimeout(() => volume50Btn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('volume:set', 50);
        showNotification('🎵 Volume réglé à 50% !', 'success');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }

  // Bouton Volume 100%
  const volume100Btn = document.querySelector('button[title="Volume maximum"]');
  if (volume100Btn) {
    volume100Btn.addEventListener('click', () => {
      volume100Btn.style.transform = 'scale(0.95)';
      setTimeout(() => volume100Btn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('volume:set', 100);
        showNotification('🔊 Volume au maximum !', 'success');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }

  // Preset Musique
  const musicBtn = document.querySelector('button[title="Mode musique"]');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      musicBtn.style.transform = 'scale(0.95)';
      setTimeout(() => musicBtn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('audio:preset', 'music');
        showNotification('🎶 Mode musique activé !', 'success');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }

  // Preset Gaming
  const gamingBtn = document.querySelector('button[title="Mode gaming"]');
  if (gamingBtn) {
    gamingBtn.addEventListener('click', () => {
      gamingBtn.style.transform = 'scale(0.95)';
      setTimeout(() => gamingBtn.style.transform = 'scale(1)', 150);

      if (window.socket) {
        window.socket.emit('audio:preset', 'gaming');
        showNotification('🎮 Mode gaming activé !', 'success');
      } else {
        showNotification('❌ Socket.IO non connecté', 'error');
      }
    });
  }
}

/**
 * Initialise toutes les fonctionnalités au chargement de la page
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎛️ Ermot Server - Interface initialisée avec fonctionnalités avancées');

  // Initialiser les nouvelles fonctionnalités
  initSystemFeatures();
  initVolumeControls();

  console.log('✅ Toutes les fonctionnalités sont prêtes !');
});
