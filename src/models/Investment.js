// src/models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Investment must belong to a user']
  },
  property: {
    type: mongoose.Schema.ObjectId,
    ref: 'Property',
    required: [true, 'Investment must be associated with a property']
  },
  tokensPurchased: {
    type: Number,
    required: [true, 'Number of tokens purchased must be specified'],
    min: [1, 'Must purchase at least 1 token']
  },
  investmentAmount: {
    type: Number,
    required: [true, 'Investment amount must be specified'],
    min: [0, 'Investment amount cannot be negative']
  },
  tokenPrice: {
    type: Number,
    required: [true, 'Token price must be specified']
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'Sold', 'Pending'],
    default: 'Active'
  },
  currentValue: {
    type: Number,
    default: function() {
      return this.investmentAmount;
    }
  },
  blockchainTransactionHash: {
    type: String,
    unique: true,
    sparse: true
  },
  dividends: [{
    amount: Number,
    date: Date,
    type: {
      type: String,
      enum: ['Rental', 'Appreciation', 'Other']
    }
  }],
  sellOrders: [{
    quantity: Number,
    price: Number,
    date: Date,
    status: {
      type: String,
      enum: ['Open', 'Filled', 'Cancelled']
    }
  }]
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for performance
investmentSchema.index({ user: 1, property: 1 });

// Virtual to calculate total return
investmentSchema.virtual('totalReturn').get(function() {
  return this.currentValue - this.investmentAmount;
});

// Virtual to calculate return percentage
investmentSchema.virtual('returnPercentage').get(function() {
  return ((this.currentValue - this.investmentAmount) / this.investmentAmount) * 100;
});

// Populate middleware
investmentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name email'
  }).populate({
    path: 'property',
    select: 'title location category'
  });
  next();
});

// Static method to calculate user's total investment
investmentSchema.statics.calculateUserTotalInvestment = async function(userId) {
  const stats = await this.aggregate([
    {
      $match: { user: userId }
    },
    {
      $group: {
        _id: null,
        totalInvestment: { $sum: '$investmentAmount' },
        totalCurrentValue: { $sum: '$currentValue' },
        totalTokens: { $sum: '$tokensPurchased' }
      }
    }
  ]);

  return stats[0] || { 
    totalInvestment: 0, 
    totalCurrentValue: 0, 
    totalTokens: 0 
  };
};

const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment;