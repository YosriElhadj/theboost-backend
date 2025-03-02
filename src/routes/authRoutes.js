// src/routes/authRoutes.js
const express = require('express');
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.patch('/reset-password/:token', AuthController.resetPassword);

// Protected routes (require authentication)
router.use(AuthMiddleware.protect);

router.patch('/update-password', AuthController.updatePassword);

// Additional profile management routes can be added here
router.get('/me', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

module.exports = router;