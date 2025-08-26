const Book = require('../models/bookModel');
const { AppError, catchAsync } = require('../middlewares/errorMiddleware');
const { logSuccess } = require('../middlewares/loggerMiddleware');

// Get book recommendations based on user preferences
const getRecommendations = catchAsync(async (req, res) => {
  const { genre, minRating, limit = 10 } = req.query;
  
  // Build recommendation query
  const filter = {};
  
  if (genre && genre !== 'All') {
    filter.genre = genre;
  }
  
  if (minRating) {
    filter.averageRating = { $gte: parseFloat(minRating) };
  }
  
  // Get highly rated books
  const recommendations = await Book.find(filter)
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(parseInt(limit))
    .select('title author genre averageRating totalReviews description coverImage');

  logSuccess('Book recommendations generated', {
    count: recommendations.length,
    filters: { genre, minRating }
  });

  res.status(200).json({
    success: true,
    data: {
      recommendations,
      criteria: {
        genre: genre || 'All genres',
        minRating: minRating || 'Any rating',
        limit: parseInt(limit)
      }
    }
  });
});

// Get similar books based on a book ID
const getSimilarBooks = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  // First, get the reference book
  const referenceBook = await Book.findById(id);
  
  if (!referenceBook) {
    return next(new AppError('Reference book not found', 404));
  }

  // Find similar books based on genre and author
  const similarBooks = await Book.find({
    $and: [
      { _id: { $ne: id } }, // Exclude the reference book itself
      {
        $or: [
          { genre: referenceBook.genre },
          { author: referenceBook.author },
          { tags: { $in: referenceBook.tags || [] } }
        ]
      }
    ]
  })
  .sort({ averageRating: -1 })
  .limit(limit)
  .select('title author genre averageRating totalReviews description coverImage tags');

  logSuccess('Similar books found', {
    referenceBook: referenceBook.title,
    similarCount: similarBooks.length
  });

  res.status(200).json({
    success: true,
    data: {
      referenceBook: {
        id: referenceBook._id,
        title: referenceBook.title,
        author: referenceBook.author,
        genre: referenceBook.genre
      },
      similarBooks,
      count: similarBooks.length
    }
  });
});

// Intelligent search with auto-suggestions
const intelligentSearch = catchAsync(async (req, res) => {
  const { query, limit = 10 } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  // Perform text search with scoring
  const searchResults = await Book.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(parseInt(limit))
  .select('title author genre averageRating description coverImage');

  // If no text search results, fall back to regex search
  if (searchResults.length === 0) {
    const regexResults = await Book.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ averageRating: -1 })
    .limit(parseInt(limit))
    .select('title author genre averageRating description coverImage');

    return res.status(200).json({
      success: true,
      data: {
        results: regexResults,
        searchType: 'partial_match',
        query,
        count: regexResults.length
      }
    });
  }

  // Generate auto-suggestions based on the search
  const suggestions = await Book.distinct('title', {
    title: { $regex: query, $options: 'i' }
  });

  logSuccess('Intelligent search performed', {
    query,
    resultsCount: searchResults.length,
    suggestionsCount: suggestions.length
  });

  res.status(200).json({
    success: true,
    data: {
      results: searchResults,
      suggestions: suggestions.slice(0, 5), // Limit suggestions
      searchType: 'text_search',
      query,
      count: searchResults.length
    }
  });
});

// Get trending books (based on recent reviews and ratings)
const getTrendingBooks = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const daysBack = parseInt(req.query.days) || 30;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Find books with recent activity
  const trendingBooks = await Book.find({
    $or: [
      { 'reviews.reviewDate': { $gte: cutoffDate } },
      { updatedAt: { $gte: cutoffDate } }
    ]
  })
  .sort({ averageRating: -1, totalReviews: -1, updatedAt: -1 })
  .limit(limit)
  .select('title author genre averageRating totalReviews description coverImage createdAt updatedAt');

  logSuccess('Trending books retrieved', {
    count: trendingBooks.length,
    daysBack
  });

  res.status(200).json({
    success: true,
    data: {
      trendingBooks,
      count: trendingBooks.length
    }
  });
});


module.exports = {
  generateBookDetails,
  getRecommendations,
  getSimilarBooks,
  intelligentSearch,
  getTrendingBooks
};