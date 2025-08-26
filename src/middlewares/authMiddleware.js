const jwt = require('jsonwebtoken');
const { AppError } = require('./errorMiddleware');

// Simple auth middleware (basic implementation)
// You can expand this with a proper user model and authentication system

const authenticate = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Access denied. No token provided.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    } else if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    } else {
      return next(new AppError('Token verification failed', 401));
    }
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    // No token provided, continue without user info
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
  } catch (error) {
    // Invalid token, continue without user info
    console.warn('Invalid token provided:', error.message);
  }

  next();
};

// Generate JWT token (utility function)
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// Verify token utility
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Please authenticate first.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Access denied. Insufficient permissions.', 403));
    }

    next();
  };
};

// API Key authentication (alternative to JWT for simple use cases)
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return next(new AppError('API key required', 401));
  }

  // In production, store API keys in database with proper hashing
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');
  
  if (!validApiKeys.includes(apiKey)) {
    return next(new AppError('Invalid API key', 401));
  }

  // Set user info based on API key (you can customize this)
  req.user = {
    id: 'api-user',
    role: 'api',
    apiKey: apiKey
  };

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authenticateApiKey,
  generateToken,
  verifyToken
};