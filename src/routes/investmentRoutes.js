// src/routes/investmentRoutes.js
const express = require('express');
const InvestmentController = require('../controllers/investmentController');
const AuthMiddleware = require('../middleware/authMiddleware');
const ValidationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

// All investment routes require authentication
router.use(AuthMiddleware.protect);

// Get user's investments
router.get('/', InvestmentController.getMyInvestments);

// Get investment statistics
router.get('/stats', InvestmentController.getInvestmentStats);

// Get single investment
router.get('/:id', InvestmentController.getInvestment);

// Create investment
router.post(
  '/',
  ValidationMiddleware.investmentValidation(),
  ValidationMiddleware.handleValidationErrors,
  AuthMiddleware.requireVerifiedInvestor,
  AuthMiddleware.requireCompleteProfile,
  InvestmentController.createInvestment
);

// Create sell order
router.post(
  '/:id/sell',
  InvestmentController.createSellOrder
);

// Cancel sell order
router.patch(
  '/:investmentId/sell/:orderId/cancel',
  InvestmentController.cancelSellOrder
);

// Update investment value (property owner only)
router.patch(
  '/:id/value',
  InvestmentController.updateInvestmentValue
);

// Add dividend to investment (property owner only)
router.post(
  '/:id/dividend',
  InvestmentController.addDividend
);

module.exports = router;