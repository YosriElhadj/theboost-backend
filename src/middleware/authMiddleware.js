// src/middleware/authMiddleware.js
const JWTService = require('../utils/jwt');
const User = require('../models/User');

class AuthMiddleware {
  // Middleware to protect routes
  static async protect(req, res, next) {
    try {
      // 1) Check if token exists
      let token;
      if (
        req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')
      ) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'You are not logged in. Please log in to access this route.'
        });
      }

      // 2) Verify token
      const decoded = JWTService.verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token. Please log in again.'
        });
      }

      // 3) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser) {
        return res.status(401).json({
          status: 'error',
          message: 'The user belonging to this token no longer exists.'
        });
      }

      // 4) Check if user changed password after token was issued
      // This would be implemented if you add a passwordChangedAt field to the User model
      // if (currentUser.changedPasswordAfter(decoded.iat)) {
      //   return next(
      //     new AppError('User recently changed password! Please log in again.', 401)
      //   );
      // }

      // GRANT ACCESS TO PROTECTED ROUTE
      req.user = currentUser;
      next();
    } catch (error) {
      next(error);
    }
  }

  // Middleware to restrict route to specific roles
  static restrictTo(...roles) {
    return (req, res, next) => {
      // If user is not in the allowed roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to perform this action'
        });
      }
      next();
    };
  }

  // Middleware to check investor verification status
  static async requireVerifiedInvestor(req, res, next) {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'You must be logged in to access this resource.'
        });
      }

      // Check verification status
      if (req.user.verificationStatus !== 'verified') {
        return res.status(403).json({
          status: 'error',
          message: 'Your account is not verified. Please complete KYC process.',
          details: {
            currentStatus: req.user.verificationStatus
          }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // Middleware to check account completeness
  static async requireCompleteProfile(req, res, next) {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'You must be logged in to access this resource.'
        });
      }

      // Check required profile fields
      const requiredFields = [
        'name', 
        'email', 
        'phoneNumber', 
        'investorType'
      ];

      const missingFields = requiredFields.filter(field => {
        return !req.user[field] || req.user[field] === '';
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Please complete your profile',
          missingFields
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthMiddleware;