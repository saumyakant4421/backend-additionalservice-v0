// Simple logger using console, can be replaced with Winston or Pino for production
const levels = ['error', 'warn', 'info', 'debug'];

function log(level, message, meta) {
  if (!levels.includes(level)) level = 'info';
  const time = new Date().toISOString();
  if (meta) {
    console[level](`[${time}] [${level.toUpperCase()}] ${message}`, meta);
  } else {
    console[level](`[${time}] [${level.toUpperCase()}] ${message}`);
  }
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
