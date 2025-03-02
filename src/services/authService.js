// src/services/authService.js
const User = require('../models/User');
const JWTService = require('../utils/jwt');
const crypto = require('crypto');

class AuthService {
  // Register new user
  static async registerUser(userData) {
    // Check if user exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Create new user
    const newUser = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phoneNumber: userData.phoneNumber,
      investorType: userData.investorType || 'individual'
    });

    // Generate tokens
    const accessToken = JWTService.createAccessToken(newUser);
    const refreshToken = JWTService.createRefreshToken(newUser);

    // Remove password from output
    newUser.password = undefined;

    return {
      user: newUser,
      accessToken,
      refreshToken
    };
  }

  // Login user
  static async loginUser(email, password) {
    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
      throw new Error('Incorrect email or password');
    }

    // Generate tokens
    const accessToken = JWTService.createAccessToken(user);
    const refreshToken = JWTService.createRefreshToken(user);

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Remove password from output
    user.password = undefined;

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  // Refresh token
  static async refreshUserToken(refreshToken) {
    // Verify refresh token
    const decoded = JWTService.verifyToken(refreshToken);
    
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error('User no longer exists');
    }

    // Generate new tokens
    const newAccessToken = JWTService.createAccessToken(user);
    const newRefreshToken = JWTService.createRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  // Create password reset token
  static async createPasswordResetToken(email) {
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('No user found with that email');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Token expires in 10 minutes
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    await user.save({ validateBeforeSave: false });
    
    return resetToken;
  }

  // Reset password with token
  static async resetPassword(token, newPassword) {
    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      throw new Error('Token is invalid or has expired');
    }
    
    // Update password and remove reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    // Generate new tokens
    const accessToken = JWTService.createAccessToken(user);
    const refreshToken = JWTService.createRefreshToken(user);
    
    return {
      accessToken,
      refreshToken
    };
  }

  // Update user password
  static async updatePassword(userId, currentPassword, newPassword) {
    // Get user with password
    const user = await User.findById(userId).select('+password');
    
    // Check if current password is correct
    if (!(await user.correctPassword(currentPassword, user.password))) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Generate new tokens
    const accessToken = JWTService.createAccessToken(user);
    const refreshToken = JWTService.createRefreshToken(user);
    
    return {
      accessToken,
      refreshToken
    };
  }

  // Update user profile
  static async updateUserProfile(userId, userData) {
    // Fields that can be updated
    const allowedFields = ['name', 'phoneNumber', 'profileImage'];
    
    // Filter update data
    const updateData = {};
    Object.keys(userData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = userData[key];
      }
    });
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }

  // Submit KYC documents
  static async submitKycDocuments(userId, documents) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Add documents to user profile
    documents.forEach(doc => {
      user.kycDocuments.push({
        type: doc.type,
        documentNumber: doc.documentNumber,
        uploadDate: new Date(),
        verificationStatus: 'pending'
      });
    });
    
    // Update verification status
    user.verificationStatus = 'pending';
    await user.save();
    
    return user;
  }
}

module.exports = AuthService;