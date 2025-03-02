// src/config/env.js
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/theboost',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '7d',
  
  // Blockchain configurations
  BLOCKCHAIN_NETWORK: process.env.BLOCKCHAIN_NETWORK || 'mainnet',
  
  // Email configurations
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  
  // Application environment
  NODE_ENV: process.env.NODE_ENV || 'development'
};