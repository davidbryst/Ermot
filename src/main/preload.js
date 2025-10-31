const { contextBridge, ipcRenderer } = require('electron');

/**
 * Script de préchargement qui expose de manière sécurisée
 * les APIs Electron au processus de rendu
 */

contextBridge.exposeInMainWorld('api', (() => {
  // Helper to subscribe to both ipcRenderer events and window.postMessage messages.
  // Returns an unsubscribe function.
  function subscribe(channel, callback) {
    if (typeof callback !== 'function') return () => {};

    // ipcRenderer listener (for webContents.send)
    const ipcListener = (event, data) => {
      try { callback(data); } catch (e) { console.error('api.' + channel + ' callback error (ipc):', e); }
    };
    ipcRenderer.on(channel, ipcListener);

    // window.postMessage listener (for webContents.postMessage)
    const windowListener = (event) => {
      try {
        const d = event && event.data;
        // event.data may be the payload itself or an object with { channel, args }
        if (!d) return;

        // If electron's postMessage is used, shape can be { channel, args: [...] }
        if (d && d.channel === channel) {
          // prefer args[0] if present
          const payload = Array.isArray(d.args) && d.args.length ? d.args[0] : d;
          try { callback(payload); } catch (e) { console.error('api.' + channel + ' callback error (postMessage):', e); }
          return;
        }

        // Fallback: if payload itself contains a top-level 'type' or 'channel' property
        if (d && (d.type === channel || d._channel === channel)) {
          try { callback(d); } catch (e) { console.error('api.' + channel + ' callback error (postMessage fallback):', e); }
        }
      } catch (err) {
        console.warn('window.postMessage handler error for channel', channel, err);
      }
    };

    window.addEventListener('message', windowListener);

    // Return unsubscribe helper
    return () => {
      try { ipcRenderer.removeListener(channel, ipcListener); } catch (e) {}
      try { window.removeEventListener('message', windowListener); } catch (e) {}
    };
  }

  return {
    onState: (cb) => subscribe('state', cb),
    onVolume: (cb) => subscribe('volume', cb),
    onMouse: (cb) => subscribe('mouse', cb),
    onQRCode: (cb) => subscribe('qrcode', cb),
    onMobileServer: (cb) => subscribe('mobile-server', cb)
  };
})());
