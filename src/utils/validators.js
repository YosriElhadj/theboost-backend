// src/utils/validators.js

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };
  
  /**
   * Validates phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  const isValidPhone = (phone) => {
    const phonePattern = /^(\+\d{1,3}[- ]?)?\d{10}$/;
    return phonePattern.test(phone);
  };
  
  /**
   * Validates if a value is numeric
   * @param {*} value - Value to check
   * @returns {boolean} - True if numeric, false otherwise
   */
  const isNumeric = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  };
  
  /**
   * Validates URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  /**
   * Validates if a string is a valid MongoDB ObjectId
   * @param {string} id - ID to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };
  
  /**
   * Validates password strength
   * @param {string} password - Password to validate
   * @returns {object} - Validation result with status and message
   */
  const validatePasswordStrength = (password) => {
    if (!password || password.length < 8) {
      return {
        valid: false,
        message: 'Password must be at least 8 characters long'
      };
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      };
    }
    
    return {
      valid: true,
      message: 'Password meets strength requirements'
    };
  };
  
  /**
   * Validates investment amount
   * @param {number} amount - Investment amount
   * @param {number} minAmount - Minimum investment amount
   * @returns {object} - Validation result with status and message
   */
  const validateInvestmentAmount = (amount, minAmount) => {
    if (!isNumeric(amount)) {
      return {
        valid: false,
        message: 'Investment amount must be a number'
      };
    }
    
    if (parseFloat(amount) <= 0) {
      return {
        valid: false,
        message: 'Investment amount must be greater than zero'
      };
    }
    
    if (minAmount && parseFloat(amount) < minAmount) {
      return {
        valid: false,
        message: `Minimum investment amount is ${minAmount}`
      };
    }
    
    return {
      valid: true,
      message: 'Investment amount is valid'
    };
  };
  
  /**
   * Sanitizes an object by removing specified fields
   * @param {object} obj - Object to sanitize
   * @param {Array} fieldsToRemove - Fields to remove from object
   * @returns {object} - Sanitized object
   */
  const sanitizeObject = (obj, fieldsToRemove = []) => {
    const sanitized = { ...obj };
    
    fieldsToRemove.forEach(field => {
      delete sanitized[field];
    });
    
    return sanitized;
  };
  
  module.exports = {
    isValidEmail,
    isValidPhone,
    isNumeric,
    isValidUrl,
    isValidObjectId,
    validatePasswordStrength,
    validateInvestmentAmount,
    sanitizeObject
  };