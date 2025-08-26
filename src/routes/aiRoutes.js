const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Import Controller Functions
const {
  generateBookDetails,
  getRecommendations,
  getSimilarBooks,
  intelligentSearch,
  getTrendingBooks
} = require('../controllers/aiController');

// Import Validation Middleware and Schemas
const { validate, validateQuery, validateParams, schemas } = require('../middlewares/validationMiddleware');

// --- Generative AI Route ---
// Generate new book data based on a prompt
router.post(
  '/generate-book',
  validate(Joi.object({ userPrompt: Joi.string().trim().min(3).required() })),
  generateBookDetails
); // POST /api/ai/generate-book

// --- Recommendation and Discovery Routes ---
// Get personalized book recommendations
router.get(
  '/recommendations',
  validateQuery(Joi.object({
    genre: Joi.string().trim(),
    minRating: Joi.number().min(0).max(5),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getRecommendations
); // GET /api/ai/recommendations?genre=Sci-Fi

// Get books similar to a specific book
router.get(
  '/similar/:id',
  validateParams('id', schemas.mongoId),
  getSimilarBooks
); // GET /api/ai/similar/60d...

// Get trending books
router.get(
  '/trending',
  validateQuery(Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
      days: Joi.number().integer().min(1).max(365).default(30)
  })),
  getTrendingBooks
); // GET /api/ai/trending?days=7

// --- Intelligent Search Route ---
// Perform a text-based or regex search
router.get(
  '/search',
  validateQuery(Joi.object({
    query: Joi.string().trim().required(),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  intelligentSearch
); // GET /api/ai/search?query=space...

module.exports = router;