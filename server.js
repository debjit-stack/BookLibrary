require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- FIX 1: Correctly import middleware functions ---
// By using destructuring {}, we pull the specific functions out of the imported modules.
const { errorMiddleware } = require(path.join(__dirname, 'src', 'middlewares', 'errorMiddleware'));
const { loggerMiddleware } = require(path.join(__dirname, 'src', 'middlewares', 'loggerMiddleware'));

// Import routes
const bookRoutes = require(path.join(__dirname, 'src', 'routes', 'bookRoutes'));
const aiRoutes = require(path.join(__dirname, 'src', 'routes', 'aiRoutes'));

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// CORS setup
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(loggerMiddleware); // This now correctly uses the imported function

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Book Library API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/books', bookRoutes);
app.use('/api/ai', aiRoutes);

// 404 fallback
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorMiddleware); // This now correctly uses the imported function

// DB connection
// --- FIX 2: Removed deprecated Mongoose options ---
// The options `useNewUrlParser` and `useUnifiedTopology` are no longer needed in Mongoose v7+
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/book-library')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`📘 API Base: http://localhost:${PORT}/api`);
    });
  }).catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });

// Graceful shutdown
const shutdown = () => {
  console.log('⚠️ Gracefully shutting down...');
  mongoose.connection.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;