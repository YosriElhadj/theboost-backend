// src/controllers/transactionController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class TransactionController {
  // Get all transactions for current user
  static async getMyTransactions(req, res, next) {
    try {
      // Build query with filters
      const queryObj = { ...req.query, user: req.user.id };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach(el => delete queryObj[el]);

      // Advanced filtering
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      let query = Transaction.find(JSON.parse(queryStr));

      // Sorting
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }

      // Field limiting
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
      } else {
        query = query.select('-__v');
      }

      // Pagination
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);

      // Execute query
      const transactions = await query;

      // Get transaction summary
      const summary = await Transaction.getUserTransactionSummary(req.user.id);

      res.status(200).json({
        status: 'success',
        results: transactions.length,
        summary,
        data: {
          transactions
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get transaction by ID
  static async getTransaction(req, res, next) {
    try {
      const transaction = await Transaction.findById(req.params.id)
        .populate('relatedEntity.entityId');

      if (!transaction) {
        return res.status(404).json({
          status: 'error',
          message: 'No transaction found with that ID'
        });
      }

      // Check if user owns the transaction or has admin role
      if (transaction.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view this transaction'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          transaction
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create deposit transaction
  static async createDeposit(req, res, next) {
    try {
      // Validate deposit amount
      if (!req.body.amount || req.body.amount <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid deposit amount'
        });
      }

      // Create pending deposit transaction
      const transaction = await Transaction.create({
        user: req.user.id,
        type: 'Deposit',
        amount: req.body.amount,
        currency: req.body.currency || 'USD',
        status: 'Pending',
        description: req.body.description || 'Wallet deposit',
        paymentMethod: req.body.paymentMethod,
        metadata: req.body.metadata || {}
      });

      // Note: In a real application, this would integrate with a payment processor
      // and the status would be updated asynchronously

      res.status(201).json({
        status: 'success',
        data: {
          transaction
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create withdrawal transaction
  static async createWithdrawal(req, res, next) {
    try {
      // Validate withdrawal amount
      if (!req.body.amount || req.body.amount <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid withdrawal amount'
        });
      }

      // Check user's wallet balance
      const user = await User.findById(req.user.id);
      
      if (user.walletBalance < req.body.amount) {
        return res.status(400).json({
          status: 'error',
          message: 'Insufficient wallet balance'
        });
      }

      // Create pending withdrawal transaction
      const transaction = await Transaction.create({
        user: req.user.id,
        type: 'Withdrawal',
        amount: req.body.amount,
        currency: req.body.currency || 'USD',
        status: 'Pending',
        description: req.body.description || 'Wallet withdrawal',
        paymentMethod: req.body.paymentMethod,
        metadata: req.body.withdrawalDetails || {}
      });

      // Note: In a real application, this would integrate with a payment processor
      // and the status would be updated asynchronously

      res.status(201).json({
        status: 'success',
        data: {
          transaction
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Confirm transaction (For admin/system use)
  static async confirmTransaction(req, res, next) {
    try {
      const transaction = await Transaction.findById(req.params.id);

      if (!transaction) {
        return res.status(404).json({
          status: 'error',
          message: 'No transaction found with that ID'
        });
      }

      // Check if user has admin role or system permission
      if (req.user.role !== 'admin' && req.user.role !== 'system') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to confirm transactions'
        });
      }

      // Check if transaction is already completed
      if (transaction.status === 'Completed') {
        return res.status(400).json({
          status: 'error',
          message: 'Transaction is already completed'
        });
      }

      // Update transaction status
      transaction.status = 'Completed';
      transaction.completedAt = new Date();
      
      if (req.body.blockchainTransactionHash) {
        transaction.blockchainTransactionHash = req.body.blockchainTransactionHash;
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

      res.status(200).json({
        status: 'success',
        data: {
          transaction
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get transaction summary
  static async getTransactionSummary(req, res, next) {
    try {
      // Get transaction statistics
      const stats = await Transaction.aggregate([
        {
          $match: { user: req.user._id }
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
            user: req.user._id,
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

      res.status(200).json({
        status: 'success',
        data: {
          stats,
          monthlyHistory: formattedHistory
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel transaction
  static async cancelTransaction(req, res, next) {
    try {
      const transaction = await Transaction.findById(req.params.id);

      if (!transaction) {
        return res.status(404).json({
          status: 'error',
          message: 'No transaction found with that ID'
        });
      }

      // Check if user owns the transaction or has admin role
      if (transaction.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to cancel this transaction'
        });
      }

      // Check if transaction can be cancelled
      if (transaction.status !== 'Pending') {
        return res.status(400).json({
          status: 'error',
          message: `Cannot cancel transaction with status: ${transaction.status}`
        });
      }

      // Update transaction status
      transaction.status = 'Failed';
      await transaction.save();

      res.status(200).json({
        status: 'success',
        data: {
          transaction
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TransactionController;