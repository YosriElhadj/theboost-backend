// src/services/transactionService.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class TransactionService {
  // Get user transactions with filters
  static async getUserTransactions(userId, filters = {}, pagination = {}) {
    // Merge filters with user ID
    const queryParams = { ...filters, user: userId };
    
    // Extract pagination params
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = Transaction.find(queryParams);
    
    // Apply sorting
    if (pagination.sort) {
      query = query.sort(pagination.sort);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Apply pagination
    query = query.skip(skip).limit(limit);
    
    // Execute query
    const transactions = await query;
    const total = await Transaction.countDocuments(queryParams);
    
    // Get transaction summary
    const summary = await Transaction.getUserTransactionSummary(userId);
    
    return {
      transactions,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get transaction by ID
  static async getTransactionById(transactionId, userId) {
    const transaction = await Transaction.findById(transactionId)
      .populate('relatedEntity.entityId');
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if user owns the transaction
    if (transaction.user._id.toString() !== userId) {
      throw new Error('You do not have permission to view this transaction');
    }
    
    return transaction;
  }

  // Create deposit transaction
  static async createDeposit(depositData, userId) {
    // Validate deposit amount
    if (!depositData.amount || depositData.amount <= 0) {
      throw new Error('Invalid deposit amount');
    }
    
    // Create pending deposit transaction
    const transaction = await Transaction.create({
      user: userId,
      type: 'Deposit',
      amount: depositData.amount,
      currency: depositData.currency || 'USD',
      status: 'Pending',
      description: depositData.description || 'Wallet deposit',
      paymentMethod: depositData.paymentMethod,
      metadata: depositData.metadata || {}
    });
    
    // Note: In a real application, this would integrate with a payment processor
    // and the status would be updated asynchronously
    
    return transaction;
  }

  // Create withdrawal transaction
  static async createWithdrawal(withdrawalData, userId) {
    // Validate withdrawal amount
    if (!withdrawalData.amount || withdrawalData.amount <= 0) {
      throw new Error('Invalid withdrawal amount');
    }
    
    // Check user's wallet balance
    const user = await User.findById(userId);
    
    if (user.walletBalance < withdrawalData.amount) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Create pending withdrawal transaction
    const transaction = await Transaction.create({
      user: userId,
      type: 'Withdrawal',
      amount: withdrawalData.amount,
      currency: withdrawalData.currency || 'USD',
      status: 'Pending',
      description: withdrawalData.description || 'Wallet withdrawal',
      paymentMethod: withdrawalData.paymentMethod,
      metadata: withdrawalData.withdrawalDetails || {}
    });
    
    // Note: In a real application, this would integrate with a payment processor
    // and the status would be updated asynchronously
    
    return transaction;
  }

  // Confirm transaction (For admin/system use)
  static async confirmTransaction(transactionId, confirmationData, adminId) {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if transaction is already completed
    if (transaction.status === 'Completed') {
      throw new Error('Transaction is already completed');
    }
    
    // Update transaction status
    transaction.status = 'Completed';
    transaction.completedAt = new Date();
    
    if (confirmationData.blockchainTransactionHash) {
      transaction.blockchainTransactionHash = confirmationData.blockchainTransactionHash;
    }
    
    await transaction.save();
    
    // Update user's wallet balance
    const user = await User.findById(transaction.user);
    
    if (transaction.type === 'Deposit') {
      user.walletBalance += transaction.amount;
    } else if (transaction.type === 'Withdrawal') {
      user.walletBalance -= transaction.amount;
    }
    
    await user.save();
    
    return transaction;
  }

  // Cancel transaction
  static async cancelTransaction(transactionId, userId) {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if user owns the transaction
    if (transaction.user._id.toString() !== userId) {
      throw new Error('You do not have permission to cancel this transaction');
    }
    
    // Check if transaction can be cancelled
    if (transaction.status !== 'Pending') {
      throw new Error(`Cannot cancel transaction with status: ${transaction.status}`);
    }
    
    // Update transaction status
    transaction.status = 'Failed';
    await transaction.save();
    
    return transaction;
  }

  // Get transaction summary
  static async getTransactionSummary(userId) {
    // Get transaction statistics
    const stats = await Transaction.aggregate([
      {
        $match: { user: userId }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);
    
    // Get monthly transaction history
    const monthlyHistory = await Transaction.aggregate([
      {
        $match: { 
          user: userId,
          status: 'Completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            type: '$type'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);
    
    // Format monthly history
    const formattedHistory = monthlyHistory.map(item => ({
      year: item._id.year,
      month: item._id.month,
      type: item._id.type,
      totalAmount: item.totalAmount,
      count: item.count
    }));
    
    return {
      stats,
      monthlyHistory: formattedHistory
    };
  }

  // Process refund
  static async processRefund(transactionId, refundData, adminId) {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Only completed transactions can be refunded
    if (transaction.status !== 'Completed') {
      throw new Error(`Cannot refund transaction with status: ${transaction.status}`);
    }
    
    // Only certain transaction types can be refunded
    const refundableTypes = ['Deposit', 'Investment Purchase'];
    
    if (!refundableTypes.includes(transaction.type)) {
      throw new Error(`Cannot refund transaction of type: ${transaction.type}`);
    }
    
    // Create refund transaction
    const refundTransaction = await Transaction.create({
      user: transaction.user,
      type: transaction.type === 'Deposit' ? 'Withdrawal' : 'Investment Sale',
      amount: transaction.amount,
      currency: transaction.currency,
      status: 'Completed',
      description: refundData.reason || `Refund for transaction ${transaction._id}`,
      relatedEntity: transaction.relatedEntity,
      completedAt: new Date(),
      metadata: {
        refundedTransaction: transaction._id,
        refundReason: refundData.reason
      }
    });
    
    // Update original transaction status
    transaction.status = 'Refunded';
    await transaction.save();
    
    // Update user's wallet balance if needed
    if (transaction.type === 'Investment Purchase') {
      const user = await User.findById(transaction.user);
      user.walletBalance += transaction.amount;
      await user.save();
    }
    
    return refundTransaction;
  }
}

module.exports = TransactionService;