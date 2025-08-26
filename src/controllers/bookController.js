const Book = require('../models/bookModel');
const { AppError, catchAsync } = require('../middlewares/errorMiddleware');
const { logSuccess, logWarning } = require('../middlewares/loggerMiddleware');

// Get all books with filtering, sorting, and pagination
const getAllBooks = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = {};
  
  // Text search
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { author: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // Filter by genre
  if (req.query.genre && req.query.genre !== 'All') {
    filter.genre = req.query.genre;
  }

  // Filter by availability
  if (req.query.availability) {
    filter['availability.status'] = req.query.availability;
  }

  // Filter by author
  if (req.query.author) {
    filter.author = { $regex: req.query.author, $options: 'i' };
  }

  // Filter by publication year range
  if (req.query.yearFrom || req.query.yearTo) {
    filter.publicationYear = {};
    if (req.query.yearFrom) filter.publicationYear.$gte = parseInt(req.query.yearFrom);
    if (req.query.yearTo) filter.publicationYear.$lte = parseInt(req.query.yearTo);
  }

  // Filter by rating
  if (req.query.minRating) {
    filter.averageRating = { $gte: parseFloat(req.query.minRating) };
  }

  // Build sort object
  let sort = {};
  if (req.query.sortBy) {
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    sort[req.query.sortBy] = sortOrder;
  } else {
    sort.createdAt = -1; // Default sort by newest first
  }

  // Execute query
  const books = await Book.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('-__v'); // Exclude version key

  // Get total count for pagination
  const totalBooks = await Book.countDocuments(filter);
  const totalPages = Math.ceil(totalBooks / limit);

  logSuccess('Books retrieved successfully', {
    count: books.length,
    totalBooks,
    page,
    filters: filter
  });

  res.status(200).json({
    success: true,
    data: {
      books,
      pagination: {
        currentPage: page,
        totalPages,
        totalBooks,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      filters: {
        search: req.query.search,
        genre: req.query.genre,
        availability: req.query.availability,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      }
    }
  });
});

// Get single book by ID
const getBookById = catchAsync(async (req, res, next) => {
  const book = await Book.findById(req.params.id).select('-__v');
  
  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  logSuccess('Book retrieved by ID', { bookId: req.params.id, title: book.title });

  res.status(200).json({
    success: true,
    data: { book }
  });
});

// Create new book
const createBook = catchAsync(async (req, res) => {
  // Add user info if available
  if (req.user) {
    req.body.addedBy = req.user.id || req.user.email || 'Authenticated User';
  }

  const book = await Book.create(req.body);

  logSuccess('New book created', { 
    bookId: book._id, 
    title: book.title, 
    author: book.author,
    addedBy: book.addedBy 
  });

  res.status(201).json({
    success: true,
    message: 'Book created successfully',
    data: { book }
  });
});

// Update book
const updateBook = catchAsync(async (req, res, next) => {
  const book = await Book.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true, // return updated document
      runValidators: true // run mongoose validators
    }
  ).select('-__v');

  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  logSuccess('Book updated', { 
    bookId: req.params.id, 
    title: book.title,
    updatedFields: Object.keys(req.body)
  });

  res.status(200).json({
    success: true,
    message: 'Book updated successfully',
    data: { book }
  });
});

// Delete book
const deleteBook = catchAsync(async (req, res, next) => {
  const book = await Book.findByIdAndDelete(req.params.id);

  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  logSuccess('Book deleted', { 
    bookId: req.params.id, 
    title: book.title 
  });

  res.status(200).json({
    success: true,
    message: 'Book deleted successfully'
  });
});

// Add review to book
const addReview = catchAsync(async (req, res, next) => {
  const book = await Book.findById(req.params.id);

  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  // Check if user already reviewed this book (if user is authenticated)
  if (req.user && req.user.email) {
    const existingReview = book.reviews.find(
      review => review.reviewerEmail === req.user.email
    );
    if (existingReview) {
      return next(new AppError('You have already reviewed this book', 400));
    }
    req.body.reviewerEmail = req.user.email;
  }

  await book.addReview(req.body);

  logSuccess('Review added to book', {
    bookId: req.params.id,
    rating: req.body.rating,
    reviewer: req.body.reviewerName
  });

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    data: { book }
  });
});

// Borrow book
const borrowBook = catchAsync(async (req, res, next) => {
  const book = await Book.findById(req.params.id);

  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  if (book.availability.availableCopies <= 0) {
    return next(new AppError('No copies available for borrowing', 400));
  }

  // Check if user already borrowed this book
  const existingBorrow = book.availability.borrowedBy.find(
    borrow => borrow.email === req.body.email
  );
  if (existingBorrow) {
    return next(new AppError('You have already borrowed this book', 400));
  }

  await book.borrowBook(req.body);

  logSuccess('Book borrowed', {
    bookId: req.params.id,
    borrower: req.body.name,
    email: req.body.email
  });

  res.status(200).json({
    success: true,
    message: 'Book borrowed successfully',
    data: { book }
  });
});

// Return book
const returnBook = catchAsync(async (req, res, next) => {
  const book = await Book.findById(req.params.id);

  if (!book) {
    return next(new AppError('Book not found', 404));
  }

  try {
    await book.returnBook(req.body.email);

    logSuccess('Book returned', {
      bookId: req.params.id,
      email: req.body.email
    });

    res.status(200).json({
      success: true,
      message: 'Book returned successfully',
      data: { book }
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

// Advanced search
const advancedSearch = catchAsync(async (req, res) => {
  const books = await Book.advancedSearch(req.query);
  const totalResults = await Book.countDocuments(
    req.query.query ? { $text: { $search: req.query.query } } : {}
  );

  logSuccess('Advanced search performed', {
    query: req.query.query,
    resultsCount: books.length,
    filters: req.query
  });

  res.status(200).json({
    success: true,
    data: {
      books,
      totalResults,
      searchParams: req.query
    }
  });
});

// Get book statistics
const getBookStats = catchAsync(async (req, res) => {
  const stats = await Book.aggregate([
    {
      $group: {
        _id: null,
        totalBooks: { $sum: 1 },
        availableBooks: {
          $sum: {
            $cond: [{ $eq: ['$availability.status', 'Available'] }, 1, 0]
          }
        },
        borrowedBooks: {
          $sum: {
            $cond: [{ $eq: ['$availability.status', 'Borrowed'] }, 1, 0]
          }
        },
        averageRating: { $avg: '$averageRating' },
        totalReviews: { $sum: '$totalReviews' }
      }
    }
  ]);

  const genreStats = await Book.aggregate([
    {
      $group: {
        _id: '$genre',
        count: { $sum: 1 },
        averageRating: { $avg: '$averageRating' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const yearStats = await Book.aggregate([
    {
      $match: { publicationYear: { $exists: true, $ne: null } }
    },
    {
      $group: {
        _id: '$publicationYear',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalBooks: 0,
        availableBooks: 0,
        borrowedBooks: 0,
        averageRating: 0,
        totalReviews: 0
      },
      genreDistribution: genreStats,
      recentPublications: yearStats
    }
  });
});

// Get books by genre
const getBooksByGenre = catchAsync(async (req, res, next) => {
  const { genre } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const books = await Book.find({ genre })
    .sort({ averageRating: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v');

  const totalBooks = await Book.countDocuments({ genre });

  if (books.length === 0) {
    return next(new AppError(`No books found in ${genre} genre`, 404));
  }

  res.status(200).json({
    success: true,
    data: {
      books,
      genre,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBooks / limit),
        totalBooks,
        hasNextPage: page < Math.ceil(totalBooks / limit),
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

// Get available books
const getAvailableBooks = catchAsync(async (req, res) => {
  const books = await Book.findAvailable()
    .sort({ averageRating: -1 })
    .select('-__v');

  res.status(200).json({
    success: true,
    data: {
      books,
      count: books.length
    }
  });
});

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  addReview,
  borrowBook,
  returnBook,
  advancedSearch,
  getBookStats,
  getBooksByGenre,
  getAvailableBooks
};