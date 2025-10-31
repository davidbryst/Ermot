const crypto = require('crypto');
const logger = require('./logger');

/**
 * Gestionnaire de sessions pour les codes de connexion
 */
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Génère un code unique court
   * @returns {string} Code de 6 caractères
   */
  generateCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  /**
   * Crée une nouvelle session avec un code unique
   * @param {string} serverUrl - URL du serveur Socket.IO
   * @param {string} mobileUrl - URL du client mobile
   * @returns {string} Code généré
   */
  createSession(serverUrl, mobileUrl) {
    const code = this.generateCode();
    this.sessions.set(code, {
      serverUrl,
      mobileUrl,
      createdAt: Date.now()
    });

  logger.info(`[SessionManager] Session created: ${code} -> ${serverUrl}`);
    return code;
  }

  /**
   * Récupère les informations d'une session
   * @param {string} code - Code de session
   * @returns {Object|null} Informations de session ou null
   */
  getSession(code) {
    return this.sessions.get(code.toUpperCase()) || null;
  }

  /**
   * Nettoie les sessions expirées (plus de 24h)
   */
  cleanExpiredSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 heures

    for (const [code, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.sessions.delete(code);
  logger.info(`[SessionManager] Removed expired session: ${code}`);
      }
    }
  }

  /**
   * Obtient le nombre de sessions actives
   * @returns {number}
   */
  getSessionCount() {
    return this.sessions.size;
  }
}

// Instance singleton
const sessionManager = new SessionManager();

// Nettoyer les sessions expirées toutes les heures
setInterval(() => {
  sessionManager.cleanExpiredSessions();
}, 60 * 60 * 1000);

module.exports = sessionManager;

