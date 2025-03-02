// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

class JWTService {
  // Create access token for authentication
  static createAccessToken(user) {
    return jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role || 'user'
      }, 
      env.JWT_SECRET,
      { 
        expiresIn: env.JWT_EXPIRATION
      }
    );
  }

  // Create refresh token with longer expiration
  static createRefreshToken(user) {
    return jwt.sign(
      { 
        id: user._id,
        tokenVersion: user.tokenVersion || 0 
      }, 
      env.JWT_SECRET,
      { 
        expiresIn: '30d' // Refresh token lasts longer
      }
    );
  }

  // Verify token and return decoded payload
  static verifyToken(token) {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = JWTService;