// src/routes/propertyRoutes.js
const express = require('express');
const PropertyController = require('../controllers/propertyController');
const AuthMiddleware = require('../middleware/authMiddleware');
const ValidationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

// Public routes
router.get('/', PropertyController.getAllProperties);
router.get('/featured', PropertyController.getFeaturedProperties);
router.get('/category/:category', PropertyController.getPropertiesByCategory);
router.get('/:id', PropertyController.getProperty);

// Protected routes (require authentication)
router.use(AuthMiddleware.protect);

// Create property
router.post(
  '/',
  ValidationMiddleware.propertyValidation(),
  ValidationMiddleware.handleValidationErrors,
  PropertyController.createProperty
);

// Get user's properties
router.get('/user/my-properties', PropertyController.getMyProperties);

// Update and delete property
router.patch(
  '/:id',
  PropertyController.updateProperty
);

router.delete(
  '/:id',
  PropertyController.deleteProperty
);

// Property investment routes
router.get(
  '/:id/investments',
  PropertyController.getPropertyInvestments
);

// Update property funding status
router.patch(
  '/:id/status',
  PropertyController.updateFundingStatus
);

module.exports = router;