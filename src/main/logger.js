const config = require('./config');

// Simple logger with minimal-mode support. When minimal=true, info/debug are silenced.
const minimal = !!(config && config.logging && config.logging.minimal);

function info() {
  if (minimal) return;
  console.log.apply(console, arguments);
}

function debug() {
  if (minimal) return;
  if (console.debug) console.debug.apply(console, arguments);
  else console.log.apply(console, arguments);
}

function warn() {
  if (console.warn) console.warn.apply(console, arguments);
  else console.log.apply(console, arguments);
}

function error() {
  if (console.error) console.error.apply(console, arguments);
  else console.log.apply(console, arguments);
}

module.exports = { info, debug, warn, error };
