const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple logger function
const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta
  };

  // Console output for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
  }

  // File output for all environments
  const logString = JSON.stringify(logEntry) + '\n';
  const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
  
  fs.appendFile(logFile, logString, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
};

// Logger middleware
const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  log('info', 'Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    log('info', 'Response sent', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 'unknown'
    });

    // Call original res.end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logger
const logError = (err, req = null) => {
  log('error', err.message, {
    stack: err.stack,
    url: req ? req.url : undefined,
    method: req ? req.method : undefined,
    ip: req ? req.ip : undefined,
    body: req && req.method !== 'GET' ? req.body : undefined
  });
};

// Success logger
const logSuccess = (message, meta = {}) => {
  log('info', message, meta);
};

// Warning logger
const logWarning = (message, meta = {}) => {
  log('warn', message, meta);
};

module.exports = {
  loggerMiddleware,
  logError,
  logSuccess,
  logWarning,
  log
};