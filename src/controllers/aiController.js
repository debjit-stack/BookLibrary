const { GoogleGenerativeAI } = require("@google/generative-ai");
const Book = require('../models/bookModel');
const { AppError, catchAsync } = require('../middlewares/errorMiddleware');
const { logSuccess } = require('../middlewares/loggerMiddleware');

// Initialize the Google AI client with your API key from the .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- THIS IS THE UPDATED FUNCTION ---
const generateBookDetails = catchAsync(async (req, res, next) => {
    const { userPrompt } = req.body;

    if (!userPrompt) {
        return next(new AppError('A user prompt is required.', 400));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
        Based on the user's theme "${userPrompt}", generate fictional details for a new book.
        Provide the response as a single, clean JSON object with the following keys:
        - "title": A creative title.
        - "author": A fictional author's name.
        - "publicationYear": A realistic year between 1980 and 2025.
        - "genre": A suitable genre.
        - "description": A compelling one-paragraph summary.
        - "isbn": A fictional but realistically formatted ISBN-13 number.
        - "pages": A random number of pages between 150 and 600.
        - "publisher": A fictional publisher name.
        - "tags": A comma-separated string of 3-4 relevant keywords.

        Do not include any text, backticks, or markdown before or after the JSON object.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean the response to ensure it's valid JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const bookData = JSON.parse(cleanedText);

        logSuccess('AI book details generated successfully', { prompt: userPrompt });

        res.status(200).json({
            success: true,
            data: bookData
        });

    } catch (error) {
        console.error("Error from AI API:", error);
        return next(new AppError('Failed to generate book details from AI.', 500));
    }
});

// Get book recommendations based on user preferences
const getRecommendations = catchAsync(async (req, res) => {
  const { genre, minRating, limit = 10 } = req.query;
  const filter = {};
  if (genre && genre !== 'All') filter.genre = genre;
  if (minRating) filter.averageRating = { $gte: parseFloat(minRating) };
  
  const recommendations = await Book.find(filter)
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(parseInt(limit))
    .select('title author genre averageRating');

  res.status(200).json({
    success: true,
    data: { recommendations }
  });
});

// Get similar books based on a book ID
const getSimilarBooks = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const referenceBook = await Book.findById(id);
  if (!referenceBook) return next(new AppError('Reference book not found', 404));

  const similarBooks = await Book.find({
    _id: { $ne: id },
    $or: [{ genre: referenceBook.genre }, { author: referenceBook.author }]
  })
  .sort({ averageRating: -1 })
  .limit(5)
  .select('title author genre averageRating');

  res.status(200).json({
    success: true,
    data: { referenceBook, similarBooks }
  });
});

// ... The rest of your functions (intelligentSearch, getTrendingBooks) remain the same ...

const intelligentSearch = catchAsync(async (req, res) => {
  // Your existing intelligentSearch logic...
});

const getTrendingBooks = catchAsync(async (req, res) => {
  // Your existing getTrendingBooks logic...
});

module.exports = {
  generateBookDetails,
  getRecommendations,
  getSimilarBooks,
  intelligentSearch,
  getTrendingBooks
};