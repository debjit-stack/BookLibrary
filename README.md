# 📚 Book Library API

A comprehensive and modern RESTful API for managing a book library, featuring AI-powered book idea generation, advanced search capabilities, and a clean, intuitive frontend interface.

## ✨ Key Features

- **Full CRUD Operations**: Create, Read, Update, and Delete books in the library
- **AI-Powered Content Generation**: Use the Google Gemini API to generate new, creative book ideas and automatically populate the entry form
- **Advanced Search & Filtering**: Search for books by title, author, or description, and filter results by genre, publication year, and availability
- **Intelligent Recommendations**: Get book recommendations and find similar titles based on genre and author
- **Robust Backend**: Built with Node.js and Express, following a clean, scalable project structure
- **Secure & Optimized**: Includes security headers with helmet, rate limiting to prevent abuse, and response compression
- **Interactive Frontend**: A simple, responsive user interface built with HTML, CSS, and vanilla JavaScript to interact with the API

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, MongoDB (with Mongoose)
- **AI**: Google Generative AI (Gemini)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Validation**: Joi
- **Security**: Helmet, Express Rate Limit
- **Development**: Nodemon

## 📂 Project Structure

The project follows a standard Model-View-Controller (MVC) like pattern to keep the code organized and maintainable.

```
/
├── public/             # Frontend static files (HTML, CSS, JS)
├── src/
│   ├── config/         # Database configuration
│   ├── controllers/    # Business logic for routes
│   ├── middlewares/    # Custom Express middleware
│   ├── models/         # Mongoose data schemas
│   └── routes/         # API route definitions
├── .env                # Environment variables
├── server.js           # Main application entry point
└── package.json        # Project dependencies and scripts
```

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You will need the following software installed on your machine:

- Node.js (v16.0.0 or higher)
- npm (comes with Node.js)
- MongoDB or a MongoDB Atlas account for a cloud database

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/book-library-api.git
   cd book-library-api
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a file named `.env` in the root of the project and add the following variables. Replace the placeholder values with your own.
   
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000
   
   # MongoDB Connection String (replace with your own)
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database_name>?retryWrites=true&w=majority
   
   # Google Gemini API Key
   GEMINI_API_KEY=Your_Google_Gemini_API_Key_Here
   ```

### Running the Application

- **Development Mode**: To run the server with nodemon for automatic restarts on file changes:
  ```bash
  npm run dev
  ```

- **Production Mode**: To run the server in a production environment:
  ```bash
  npm start
  ```

Once the server is running, open the `public/index.html` file in your browser (or navigate to `http://localhost:3000`) to use the application.

## 🌐 API Endpoints

### Book Routes (`/api/books`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all books with filtering & pagination |
| POST | `/` | Create a new book |
| GET | `/:id` | Get a single book by its ID |
| PUT | `/:id` | Update a book's details |
| DELETE | `/:id` | Delete a book |
| GET | `/stats` | Get library statistics |
| POST | `/:id/reviews` | Add a review to a book |

### AI Routes (`/api/ai`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate-book` | Generate book details from a text prompt |
| GET | `/recommendations` | Get book recommendations |
| GET | `/similar/:id` | Find books similar to a given book |

## 💡 Future Improvements

- **User Authentication**: Implement JWT-based authentication to allow users to register, log in, and manage their own book collections
- **Image Uploads**: Allow users to upload their own cover images instead of using URLs
- **Advanced AI**: Use AI to analyze book descriptions and automatically generate tags or summaries
- **Testing**: Write comprehensive unit and integration tests using Jest and Supertest
