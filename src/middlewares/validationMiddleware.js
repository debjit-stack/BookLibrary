const Joi = require('joi');

// Book validation schemas
const bookCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required()
    .messages({
      'string.empty': 'Title is required',
      'string.max': 'Title cannot exceed 200 characters'
    }),
  
  author: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Author is required',
      'string.max': 'Author name cannot exceed 100 characters'
    }),
  
  isbn: Joi.string().trim().pattern(/^(?:ISBN(?:-10|-13)?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/)
    .optional().allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid ISBN number'
    }),
  
  genre: Joi.string().valid('Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Biography', 'History', 'Science', 'Technology', 'Business', 'Self-Help', 'Children', 'Young Adult', 'Poetry', 'Drama', 'Horror', 'Thriller', 'Adventure', 'Comedy', 'Other').required()
    .messages({
      'any.only': 'Please select a valid genre'
    }),
  
  publicationYear: Joi.number().integer().min(1000).max(new Date().getFullYear()).optional()
    .messages({
      'number.min': 'Publication year must be after 1000',
      'number.max': 'Publication year cannot be in the future',
      'number.integer': 'Publication year must be a valid integer'
    }),
  
  publisher: Joi.string().trim().max(100).optional().allow('')
    .messages({
      'string.max': 'Publisher name cannot exceed 100 characters'
    }),
  
  pages: Joi.number().integer().min(1).max(50000).optional()
    .messages({
      'number.min': 'Pages must be at least 1',
      'number.max': 'Pages cannot exceed 50,000',
      'number.integer': 'Pages must be a valid integer'
    }),
  
  language: Joi.string().trim().max(30).optional().default('English')
    .messages({
      'string.max': 'Language cannot exceed 30 characters'
    }),
  
  description: Joi.string().trim().max(2000).optional().allow('')
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),
  
  coverImage: Joi.string().uri().pattern(/\.(jpg|jpeg|png|gif|webp)$/i).optional().allow('')
    .messages({
      'string.uri': 'Cover image must be a valid URL',
      'string.pattern.base': 'Cover image must end in jpg, jpeg, png, gif, or webp'
    }),
  
  availability: Joi.object({
    status: Joi.string().valid('Available', 'Borrowed', 'Reserved', 'Maintenance').default('Available'),
    totalCopies: Joi.number().integer().min(0).default(1),
    availableCopies: Joi.number().integer().min(0).default(1)
  }).optional(),
  
  tags: Joi.array().items(Joi.string().trim().max(30)).optional()
    .messages({
      'string.max': 'Tag cannot exceed 30 characters'
    }),
  
  addedBy: Joi.string().trim().optional().default('System')
});

const bookUpdateSchema = bookCreateSchema.fork(['title', 'author', 'genre'], (schema) => schema.optional());

// Review validation schema
const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required()
    .messages({
      'number.min': 'Rating must be between 1 and 5',
      'number.max': 'Rating must be between 1 and 5',
      'any.required': 'Rating is required'
    }),
  
  comment: Joi.string().trim().max(1000).optional().allow('')
    .messages({
      'string.max': 'Comment cannot exceed 1000 characters'
    }),
  
  reviewerName: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Reviewer name is required',
      'string.max': 'Reviewer name cannot exceed 100 characters'
    })
});

// Borrow validation schema
const borrowSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Borrower name is required',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  dueDate: Joi.date().min('now').optional()
    .messages({
      'date.min': 'Due date cannot be in the past'
    })
});

// Search validation schema
const searchSchema = Joi.object({
  query: Joi.string().trim().max(200).optional(),
  genre: Joi.string().optional(),
  author: Joi.string().trim().max(100).optional(),
  minYear: Joi.number().integer().min(1000).optional(),
  maxYear: Joi.number().integer().min(1000).max(new Date().getFullYear()).optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  availability: Joi.string().valid('Available', 'Borrowed', 'Reserved', 'Maintenance').optional(),
  sortBy: Joi.string().valid('title', 'author', 'publicationYear', 'averageRating', 'createdAt').default('title'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

// Middleware function to validate request data
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // return all validation errors
      allowUnknown: false, // don't allow unknown fields
      stripUnknown: true // remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Middleware function to validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true, // allow unknown query params for flexibility
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors: errors
      });
    }

    // Replace req.query with validated data
    req.query = value;
    next();
  };
};

// Middleware function to validate URL parameters
const validateParams = (paramName, schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params[paramName]);

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
        error: error.details[0].message
      });
    }

    req.params[paramName] = value;
    next();
  };
};

// MongoDB ObjectId validation schema
const mongoIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format'
  });

module.exports = {
  validate,
  validateQuery,
  validateParams,
  schemas: {
    bookCreate: bookCreateSchema,
    bookUpdate: bookUpdateSchema,
    review: reviewSchema,
    borrow: borrowSchema,
    search: searchSchema,
    mongoId: mongoIdSchema
  }
};