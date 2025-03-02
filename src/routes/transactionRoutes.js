// src/routes/transactionRoutes.js
const express = require('express');
const TransactionController = require('../controllers/transactionController');
const AuthMiddleware = require('../middleware/authMiddleware');
const ValidationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

// All transaction routes require authentication
router.use(AuthMiddleware.protect);

// Get user's transactions
router.get('/', TransactionController.getMyTransactions);

// Get transaction summary
router.get('/summary', TransactionController.getTransactionSummary);

// Get single transaction
router.get('/:id', TransactionController.getTransaction);

// Create deposit transaction
router.post(
  '/deposit',
  ValidationMiddleware.transactionValidation(),
  ValidationMiddleware.handleValidationErrors,
  TransactionController.createDeposit
);

// Create withdrawal transaction
router.post(
  '/withdraw',
  ValidationMiddleware.transactionValidation(),
  ValidationMiddleware.handleValidationErrors,
  AuthMiddleware.requireVerifiedInvestor,
  TransactionController.createWithdrawal
);

// Cancel transaction
router.patch(
  '/:id/cancel',
  TransactionController.cancelTransaction
);

// Admin routes
router.patch(
  '/:id/confirm',
  AuthMiddleware.restrictTo('admin', 'system'),
  TransactionController.confirmTransaction
);

module.exports = router;