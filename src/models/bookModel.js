const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  reviewerName: {
    type: String,
    required: true,
    maxlength: 100
  },
  reviewDate: {
    type: Date,
    default: Date.now
  }
});

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  isbn: {
    type: String,
    //unique: true,
    sparse: true, // allows multiple null values
    trim: true,
    validate: {
      validator: function(v) {
        // ISBN-10 or ISBN-13 validation (basic)
        if (!v) return true; // optional field
        return /^(?:ISBN(?:-10|-13)?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/.test(v.replace(/[- ]/g, ''));
      },
      message: 'Please provide a valid ISBN number'
    }
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    trim: true,
    enum: {
      values: ['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Biography', 'History', 'Science', 'Technology', 'Business', 'Self-Help', 'Children', 'Young Adult', 'Poetry', 'Drama', 'Horror', 'Thriller', 'Adventure', 'Comedy', 'Other'],
      message: 'Please select a valid genre'
    }
  },
  publicationYear: {
    type: Number,
    min: [1000, 'Publication year must be after 1000'],
    max: [new Date().getFullYear(), 'Publication year cannot be in the future'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Publication year must be a valid integer'
    }
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [100, 'Publisher name cannot exceed 100 characters']
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1'],
    max: [50000, 'Pages cannot exceed 50,000'],
    validate: {
      validator: function(v) {
        return !v || Number.isInteger(v);
      },
      message: 'Pages must be a valid integer'
    }
  },
  language: {
    type: String,
    default: 'English',
    trim: true,
    maxlength: [30, 'Language cannot exceed 30 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  coverImage: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Cover image must be a valid URL ending in jpg, jpeg, png, gif, or webp'
    }
  },
  availability: {
    status: {
      type: String,
      enum: ['Available', 'Borrowed', 'Reserved', 'Maintenance'],
      default: 'Available'
    },
    totalCopies: {
      type: Number,
      default: 1,
      min: [0, 'Total copies cannot be negative']
    },
    availableCopies: {
      type: Number,
      default: 1,
      min: [0, 'Available copies cannot be negative']
    },
    borrowedBy: [{
      name: String,
      email: String,
      borrowDate: {
        type: Date,
        default: Date.now
      },
      dueDate: Date
    }]
  },
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  addedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true, // adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted publication info
bookSchema.virtual('publicationInfo').get(function() {
  if (this.publisher && this.publicationYear) {
    return `${this.publisher} (${this.publicationYear})`;
  } else if (this.publicationYear) {
    return `${this.publicationYear}`;
  } else if (this.publisher) {
    return this.publisher;
  }
  return 'Publication info not available';
});

// Pre-save middleware to calculate average rating
bookSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = Math.round((totalRating / this.reviews.length) * 10) / 10; // Round to 1 decimal
    this.totalReviews = this.reviews.length;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }
  
  // Ensure available copies doesn't exceed total copies
  if (this.availability.availableCopies > this.availability.totalCopies) {
    this.availability.availableCopies = this.availability.totalCopies;
  }
  
  next();
});

// Index for better search performance
bookSchema.index({ title: 'text', author: 'text', description: 'text' });
bookSchema.index({ genre: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ publicationYear: 1 });
bookSchema.index({ 'availability.status': 1 });
bookSchema.index({ averageRating: -1 });

// Instance method to add review
bookSchema.methods.addReview = function(reviewData) {
  this.reviews.push(reviewData);
  return this.save();
};

// Instance method to borrow book
bookSchema.methods.borrowBook = function(borrowerInfo) {
  if (this.availability.availableCopies <= 0) {
    throw new Error('No copies available for borrowing');
  }
  
  this.availability.borrowedBy.push({
    name: borrowerInfo.name,
    email: borrowerInfo.email,
    borrowDate: new Date(),
    dueDate: borrowerInfo.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days default
  });
  
  this.availability.availableCopies -= 1;
  
  if (this.availability.availableCopies === 0) {
    this.availability.status = 'Borrowed';
  }
  
  return this.save();
};

// Instance method to return book
bookSchema.methods.returnBook = function(borrowerEmail) {
  const borrowIndex = this.availability.borrowedBy.findIndex(
    borrow => borrow.email === borrowerEmail
  );
  
  if (borrowIndex === -1) {
    throw new Error('No borrow record found for this email');
  }
  
  this.availability.borrowedBy.splice(borrowIndex, 1);
  this.availability.availableCopies += 1;
  
  if (this.availability.availableCopies > 0) {
    this.availability.status = 'Available';
  }
  
  return this.save();
};

// Static method to find available books
bookSchema.statics.findAvailable = function() {
  return this.find({ 'availability.status': 'Available', 'availability.availableCopies': { $gt: 0 } });
};

// Static method for advanced search
bookSchema.statics.advancedSearch = function(searchParams) {
  const {
    query,
    genre,
    author,
    minYear,
    maxYear,
    minRating,
    availability,
    sortBy = 'title',
    sortOrder = 'asc',
    page = 1,
    limit = 10
  } = searchParams;

  const filter = {};
  
  // Text search
  if (query) {
    filter.$text = { $search: query };
  }
  
  // Filter by genre
  if (genre && genre !== 'All') {
    filter.genre = genre;
  }
  
  // Filter by author
  if (author) {
    filter.author = new RegExp(author, 'i');
  }
  
  // Filter by publication year range
  if (minYear || maxYear) {
    filter.publicationYear = {};
    if (minYear) filter.publicationYear.$gte = parseInt(minYear);
    if (maxYear) filter.publicationYear.$lte = parseInt(maxYear);
  }
  
  // Filter by minimum rating
  if (minRating) {
    filter.averageRating = { $gte: parseFloat(minRating) };
  }
  
  // Filter by availability
  if (availability) {
    filter['availability.status'] = availability;
  }
  
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const skip = (page - 1) * limit;
  
  return this.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));
};

module.exports = mongoose.model('Book', bookSchema);