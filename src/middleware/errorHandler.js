// src/middleware/errorHandler.js
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Detailed error response for development
  if (env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } 
  // Simplified error response for production
  else if (env.NODE_ENV === 'production') {
    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: `Duplicate field value: ${Object.keys(err.keyValue)}. Please use another value!`
      });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({
        status: 'error',
        message: `Invalid input data. ${errors.join('. ')}`
      });
    }

    // JWT authentication error
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. Please log in again.'
      });
    }

    // Default error response
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message || 'Something went wrong!'
    });
  }
};

module.exports = errorHandler;