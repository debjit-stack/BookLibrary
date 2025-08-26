const express = require('express');
const router = express.Router();

// Import Controller Functions
const {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  addReview,
  borrowBook,
  returnBook,
  getBookStats,
  getBooksByGenre,
  getAvailableBooks
} = require('../controllers/bookController');

// Import Validation Middleware and Schemas
const { validate, validateQuery, validateParams, schemas } = require('../middlewares/validationMiddleware');
const Joi = require('joi'); // Import Joi for inline validation

// Optional: Import Auth Middleware for future use
// const { authenticate, authorize } = require('../middlewares/authMiddleware');

// --- Book Collection Routes ---
router.route('/')
  .get(validateQuery(schemas.search), getAllBooks) // GET /api/books?search=...&genre=...
  .post(validate(schemas.bookCreate), createBook); // POST /api/books

// --- Statistics and Utility Routes ---
router.get('/stats', getBookStats); // GET /api/books/stats
router.get('/available', getAvailableBooks); // GET /api/books/available
router.get('/genre/:genre', getBooksByGenre); // GET /api/books/genre/Fiction

// --- Single Book Routes ---
router.route('/:id')
  .get(validateParams('id', schemas.mongoId), getBookById) // GET /api/books/60d...
  .put(validateParams('id', schemas.mongoId), validate(schemas.bookUpdate), updateBook) // PUT /api/books/60d...
  .delete(validateParams('id', schemas.mongoId), deleteBook); // DELETE /api/books/60d...

// --- Book Action Routes ---
// Add a review to a book
router.post(
  '/:id/reviews',
  validateParams('id', schemas.mongoId),
  validate(schemas.review),
  addReview
); // POST /api/books/60d.../reviews

// Borrow a book
router.post(
  '/:id/borrow',
  validateParams('id', schemas.mongoId),
  validate(schemas.borrow),
  borrowBook
); // POST /api/books/60d.../borrow

// Return a book
router.post(
  '/:id/return',
  validateParams('id', schemas.mongoId),
  validate(Joi.object({ email: Joi.string().email().required().messages({'string.email': 'A valid email is required to return a book.'}) })),
  returnBook
); // POST /api/books/60d.../return


module.exports = router;