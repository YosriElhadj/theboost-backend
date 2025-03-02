// src/controllers/authController.js
const User = require('../models/User');
const JWTService = require('../utils/jwt');
const crypto = require('crypto');

class AuthController {
  // User Registration
  static async register(req, res, next) {
    try {
      // 1) Check if user already exists
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use'
        });
      }

      // 2) Create new user
      const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phoneNumber,
        investorType: req.body.investorType || 'individual'
      });

      // 3) Generate tokens
      const accessToken = JWTService.createAccessToken(newUser);
      const refreshToken = JWTService.createRefreshToken(newUser);

      // 4) Remove password from output
      newUser.password = undefined;

      // 5) Send response
      res.status(201).json({
        status: 'success',
        token: accessToken,
        refreshToken,
        data: {
          user: newUser
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // User Login
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // 1) Check if email and password exist
      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide email and password'
        });
      }

      // 2) Check if user exists and password is correct
      const user = await User.findOne({ email }).select('+password');
      
      if (!user || !(await user.correctPassword(password, user.password))) {
        return res.status(401).json({
          status: 'error',
          message: 'Incorrect email or password'
        });
      }

      // 3) Generate tokens
      const accessToken = JWTService.createAccessToken(user);
      const refreshToken = JWTService.createRefreshToken(user);

      // 4) Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      // 5) Remove password from output
      user.password = undefined;

      // 6) Send response
      res.status(200).json({
        status: 'success',
        token: accessToken,
        refreshToken,
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh Token
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      // 1) Verify refresh token
      const decoded = JWTService.verifyToken(refreshToken);
      
      if (!decoded) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid refresh token'
        });
      }

      // 2) Find user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User no longer exists'
        });
      }

      // 3) Generate new tokens
      const newAccessToken = JWTService.createAccessToken(user);
      const newRefreshToken = JWTService.createRefreshToken(user);

      // 4) Send response
      res.status(200).json({
        status: 'success',
        token: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot Password
  static async forgotPassword(req, res, next) {
    try {
      // 1) Get user based on POSTed email
      const user = await User.findOne({ email: req.body.email });
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'There is no user with this email address.'
        });
      }

      // 2) Generate random reset token
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      // 3) Send reset token via email (placeholder for actual email service)
      // You would typically use a service like SendGrid, Mailgun, etc.
      const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

      try {
        // Send email with reset token
        // await sendResetPasswordEmail(user.email, resetURL);

        res.status(200).json({
          status: 'success',
          message: 'Token sent to email!'
        });
      } catch (err) {
        // If email fails, remove reset token
        user.passwordResetToken = undefined;
        user.passwordResetExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(500).json({
          status: 'error',
          message: 'There was an error sending the email. Try again later!'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // Reset Password
  static async resetPassword(req, res, next) {
    try {
      // 1) Get user based on the token
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpire: { $gt: Date.now() }
      });

      // 2) If token has not expired, and there is user, set the new password
      if (!user) {
        return res.status(400).json({
          status: 'error',
          message: 'Token is invalid or has expired'
        });
      }

      // 3) Update password
      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save();

      // 4) Log the user in, send JWT
      const accessToken = JWTService.createAccessToken(user);
      const refreshToken = JWTService.createRefreshToken(user);

      res.status(200).json({
        status: 'success',
        token: accessToken,
        refreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  // Update Password (for logged-in users)
  static async updatePassword(req, res, next) {
    try {
      // 1) Get user from collection
      const user = await User.findById(req.user.id).select('+password');

      // 2) Check if POSTed current password is correct
      if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
        return res.status(401).json({
          status: 'error',
          message: 'Your current password is wrong.'
        });
      }

      // 3) If so, update password
      user.password = req.body.newPassword;
      await user.save();

      // 4) Log user in, send JWT
      const accessToken = JWTService.createAccessToken(user);
      const refreshToken = JWTService.createRefreshToken(user);

      res.status(200).json({
        status: 'success',
        token: accessToken,
        refreshToken
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;