// src/middleware/validationMiddleware.js
const { body, validationResult } = require('express-validator');

class ValidationMiddleware {
  // Middleware to handle validation errors
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  }

  // User registration validation rules
  static registerValidation() {
    return [
      body('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
      body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
      body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
      body('phoneNumber')
        .optional()
        .matches(/^(\+\d{1,3}[- ]?)?\d{10}$/).withMessage('Please provide a valid phone number'),
      body('investorType')
        .optional()
        .isIn(['individual', 'institutional', 'accredited']).withMessage('Invalid investor type')
    ];
  }

  // Login validation rules
  static loginValidation() {
    return [
      body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
      body('password')
        .notEmpty().withMessage('Password is required')
    ];
  }

  // Property creation validation rules
  static propertyValidation() {
    return [
      body('title')
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 100 }).withMessage('Title must be less than 100 characters'),
      body('description')
        .notEmpty().withMessage('Description is required'),
      body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['Urban Development', 'Agricultural', 'Commercial', 'Residential', 'Conservation', 'Mixed-Use'])
        .withMessage('Invalid property category'),
      body('totalValue')
        .notEmpty().withMessage('Total value is required')
        .isNumeric().withMessage('Total value must be a number'),
      body('minInvestment')
        .notEmpty().withMessage('Minimum investment is required')
        .isNumeric().withMessage('Minimum investment must be a number'),
      body('tokenPrice')
        .notEmpty().withMessage('Token price is required')
        .isNumeric().withMessage('Token price must be a number'),
      body('availableTokens')
        .notEmpty().withMessage('Available tokens is required')
        .isNumeric().withMessage('Available tokens must be a number'),
      body('totalTokens')
        .notEmpty().withMessage('Total tokens is required')
        .isNumeric().withMessage('Total tokens must be a number'),
      body('projectedReturn')
        .notEmpty().withMessage('Projected return is required')
        .isNumeric().withMessage('Projected return must be a number'),
      body('riskLevel')
        .notEmpty().withMessage('Risk level is required')
        .isIn(['Low', 'Medium', 'Medium-High', 'High']).withMessage('Invalid risk level')
    ];
  }

  // Investment creation validation rules
  static investmentValidation() {
    return [
      body('property')
        .notEmpty().withMessage('Property ID is required'),
      body('tokensPurchased')
        .notEmpty().withMessage('Number of tokens is required')
        .isNumeric().withMessage('Number of tokens must be a number')
        .isInt({ min: 1 }).withMessage('Must purchase at least 1 token'),
      body('investmentAmount')
        .notEmpty().withMessage('Investment amount is required')
        .isNumeric().withMessage('Investment amount must be a number')
        .isFloat({ min: 0 }).withMessage('Investment amount cannot be negative')
    ];
  }

  // Transaction creation validation rules
  static transactionValidation() {
    return [
      body('type')
        .notEmpty().withMessage('Transaction type is required')
        .isIn(['Deposit', 'Withdrawal', 'Investment Purchase', 'Investment Sale', 'Dividend', 'Token Transfer'])
        .withMessage('Invalid transaction type'),
      body('amount')
        .notEmpty().withMessage('Amount is required')
        .isNumeric().withMessage('Amount must be a number'),
      body('currency')
        .optional()
        .isIn(['USD', 'BTC', 'ETH', 'USDC']).withMessage('Invalid currency'),
      body('status')
        .optional()
        .isIn(['Pending', 'Completed', 'Failed', 'Refunded']).withMessage('Invalid transaction status')
    ];
  }
}

module.exports = ValidationMiddleware;