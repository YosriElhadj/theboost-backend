// src/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Transaction must belong to a user']
  },
  type: {
    type: String,
    required: [true, 'Transaction type must be specified'],
    enum: {
      values: [
        'Deposit', 
        'Withdrawal', 
        'Investment Purchase', 
        'Investment Sale', 
        'Dividend', 
        'Token Transfer'
      ],
      message: 'Invalid transaction type'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Transaction amount must be specified']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'BTC', 'ETH', 'USDC']
  },
  status: {
    type: String,
    required: [true, 'Transaction status must be specified'],
    enum: {
      values: ['Pending', 'Completed', 'Failed', 'Refunded'],
      message: 'Invalid transaction status'
    },
    default: 'Pending'
  },
  description: {
    type: String,
    trim: true
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Property', 'Investment', 'Wallet']
    },
    entityId: {
      type: mongoose.Schema.ObjectId,
      refPath: 'relatedEntity.entityType'
    }
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Credit Card', 'Debit Card', 'Cryptocurrency']
  },
  blockchainTransactionHash: {
    type: String,
    unique: true,
    sparse: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  fee: {
    type: Number,
    default: 0
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for performance
transactionSchema.index({ user: 1, type: 1, createdAt: -1 });

// Populate middleware
transactionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name email'
  });
  
  // Conditionally populate related entity
  if (this.options.populateRelatedEntity) {
    this.populate('relatedEntity.entityId');
  }
  
  next();
});

// Static method to calculate user's transaction summary
transactionSchema.statics.getUserTransactionSummary = async function(userId) {
  const summary = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgTransactionAmount: { $avg: '$amount' }
      }
    }
  ]);

  return summary;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;