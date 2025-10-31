const robot = require('robotjs');
const { exec } = require('child_process');
const os = require('os');
const logger = require('./logger');

/**
 * Module de contrôle à distance du PC
 */

// Configuration de la vitesse de la souris
robot.setMouseDelay(2);

/**
 * Contrôle de la souris
 */
const mouse = {
  /**
   * Déplace la souris relativement
   * @param {number} x - Déplacement horizontal
   * @param {number} y - Déplacement vertical
   */
  move: (x, y) => {
    try {
      const currentPos = robot.getMousePos();
      robot.moveMouse(currentPos.x + x, currentPos.y + y);
      return { success: true, position: robot.getMousePos() };
    } catch (error) {
      logger.error(`[remoteControl] Mouse move error: ${error && error.message ? error.message : error}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Clic de souris
   * @param {string} button - 'left', 'right', ou 'middle'
   */
  click: (button = 'left') => {
    try {
      robot.mouseClick(button);
      return { success: true, button };
    } catch (error) {
      logger.error(`[remoteControl] Mouse click error: ${error && error.message ? error.message : error}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Double-clic
   */
  doubleClick: () => {
    try {
      robot.mouseClick('left', true);
      return { success: true };
    } catch (error) {
      logger.error(`[remoteControl] Double-click error: ${error && error.message ? error.message : error}`);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Contrôle du clavier
 */
const keyboard = {
  /**
   * Tape un texte
   * @param {string} text - Texte à taper
   */
  type: (text) => {
    try {
      robot.typeString(text);
      return { success: true, text };
    } catch (error) {
      logger.error(`[remoteControl] Keyboard type error: ${error && error.message ? error.message : error}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Appuie sur une touche
   * @param {string} key - Nom de la touche
   * @param {Array} modifiers - Touches de modification (ctrl, shift, alt)
   */
  press: (key, modifiers = []) => {
    try {
      robot.keyTap(key, modifiers);
      return { success: true, key, modifiers };
    } catch (error) {
      logger.error(`[remoteControl] Key press error: ${error && error.message ? error.message : error}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Récupère le texte du presse-papiers
   */
  getClipboard: () => {
    try {
      // Utiliser l'API Electron clipboard (plus fiable que robotjs)
      const { clipboard } = require('electron');
  const text = clipboard.readText();
  logger.info('[remoteControl] Clipboard read: ' + (text ? `${text.substring(0, 50)}${text.length > 50 ? '...' : ''}` : '(empty)'));
  return text || '';
    } catch (error) {
      logger.error(`[remoteControl] Clipboard read error: ${error && error.message ? error.message : error}`);
      return '';
    }
  },

  /**
   * Raccourcis spéciaux
   */
  shortcuts: {
    copy: () => keyboard.press('c', ['control']),
    paste: () => keyboard.press('v', ['control']),
    cut: () => keyboard.press('x', ['control']),
    undo: () => keyboard.press('z', ['control']),
    redo: () => keyboard.press('z', ['control', 'shift']),
    save: () => keyboard.press('s', ['control']),
    selectAll: () => keyboard.press('a', ['control']),
    find: () => keyboard.press('f', ['control']),
    newTab: () => keyboard.press('t', ['control']),
    closeTab: () => keyboard.press('w', ['control']),
    refresh: () => keyboard.press('f5'),
    screenshot: () => keyboard.press('printscreen'),
    altTab: () => keyboard.press('tab', ['alt']),
    taskManager: () => keyboard.press('escape', ['control', 'shift']),
  }
};

/**
 * Contrôle multimédia
 */
const media = {
  playPause: () => keyboard.press('audio_play'),
  next: () => keyboard.press('audio_next'),
  previous: () => keyboard.press('audio_prev'),
  volumeUp: () => keyboard.press('audio_vol_up'),
  volumeDown: () => keyboard.press('audio_vol_down'),
  mute: () => keyboard.press('audio_mute'),

  /**
   * Recule de X secondes (simule flèche gauche répétée)
   */
  skipBackward: (seconds = 10) => {
    try {
      // La plupart des lecteurs utilisent flèche gauche pour reculer
      // On répète la commande selon les secondes (1 pression = ~5s généralement)
      const presses = Math.ceil(seconds / 5);
      for (let i = 0; i < presses; i++) {
        robot.keyTap('left');
      }
      return { success: true, action: 'skipBackward', seconds };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Avance de X secondes (simule flèche droite répétée)
   */
  skipForward: (seconds = 10) => {
    try {
      // La plupart des lecteurs utilisent flèche droite pour avancer
      // On répète la commande selon les secondes (1 pression = ~5s généralement)
      const presses = Math.ceil(seconds / 5);
      for (let i = 0; i < presses; i++) {
        robot.keyTap('right');
      }
      return { success: true, action: 'skipForward', seconds };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

/**
 * Contrôle système
 */
const system = {
  /**
   * Verrouille le PC
   */
  lock: () => {
    try {
      const platform = os.platform();
      let command;

      if (platform === 'win32') {
        command = 'rundll32.exe user32.dll,LockWorkStation';
      } else if (platform === 'darwin') {
        command = 'pmset displaysleepnow';
      } else {
        command = 'xdg-screensaver lock';
      }

      exec(command);
      return { success: true, action: 'lock' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Met en veille
   */
  sleep: () => {
    try {
      const platform = os.platform();
      let command;

      if (platform === 'win32') {
        command = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
      } else if (platform === 'darwin') {
        command = 'pmset sleepnow';
      } else {
        command = 'systemctl suspend';
      }

      exec(command);
      return { success: true, action: 'sleep' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Éteint le PC
   */
  shutdown: () => {
    try {
      const platform = os.platform();
      let command;

      if (platform === 'win32') {
        command = 'shutdown /s /t 0';
      } else if (platform === 'darwin') {
        command = 'sudo shutdown -h now';
      } else {
        command = 'shutdown -h now';
      }

      exec(command);
      return { success: true, action: 'shutdown' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Redémarre le PC
   */
  restart: () => {
    try {
      const platform = os.platform();
      let command;

      if (platform === 'win32') {
        command = 'shutdown /r /t 0';
      } else if (platform === 'darwin') {
        command = 'sudo shutdown -r now';
      } else {
        command = 'shutdown -r now';
      }

      exec(command);
      return { success: true, action: 'restart' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = {
  mouse,
  keyboard,
  media,
  system
};

