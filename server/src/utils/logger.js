const COLORS = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  success: '\x1b[32m',
  reset: '\x1b[0m',
};

function emit(level, args) {
  const stamp = new Date().toISOString();
  const color = COLORS[level] || COLORS.info;
  const stream = level === 'error' ? console.error : console.log;
  stream(`${color}[${stamp}] ${level.toUpperCase()}${COLORS.reset}`, ...args);
}

export const logger = {
  info: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args),
  success: (...args) => emit('success', args),
};
