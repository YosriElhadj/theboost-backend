// src/controllers/investmentController.js
const Investment = require('../models/Investment');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class InvestmentController {
  // Get all investments for current user
  static async getMyInvestments(req, res, next) {
    try {
      const investments = await Investment.find({ user: req.user.id });

      // Calculate investment stats
      const stats = await Investment.calculateUserTotalInvestment(req.user.id);

      res.status(200).json({
        status: 'success',
        results: investments.length,
        stats,
        data: {
          investments
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get investment by ID
  static async getInvestment(req, res, next) {
    try {
      const investment = await Investment.findById(req.params.id);

      if (!investment) {
        return res.status(404).json({
          status: 'error',
          message: 'No investment found with that ID'
        });
      }

      // Check if user is the owner of the investment or has admin role
      if (investment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view this investment'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          investment
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new investment
  static async createInvestment(req, res, next) {
    try {
      // 1) Get property details
      const property = await Property.findById(req.body.property);
      
      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'No property found with that ID'
        });
      }

      // 2) Check if property is open for investment
      if (!property.isInvestmentOpen()) {
        return res.status(400).json({
          status: 'error',
          message: 'This property is not open for investment at this time'
        });
      }

      // 3) Check if user has enough tokens in their wallet
      const tokensPurchased = req.body.tokensPurchased || 
        Math.floor(req.body.investmentAmount / property.tokenPrice);
      
      const investmentAmount = req.body.investmentAmount || 
        (tokensPurchased * property.tokenPrice);

      if (tokensPurchased <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid number of tokens requested'
        });
      }

      // 4) Check if enough tokens are available
      if (tokensPurchased > property.availableTokens) {
        return res.status(400).json({
          status: 'error',
          message: `Only ${property.availableTokens} tokens available`
        });
      }

      // 5) Check minimum investment requirement
      if (investmentAmount < property.minInvestment) {
        return res.status(400).json({
          status: 'error',
          message: `Minimum investment amount is ${property.minInvestment}`
        });
      }

      // 6) Check if user has sufficient wallet balance
      const user = await User.findById(req.user.id);
      
      if (user.walletBalance < investmentAmount) {
        return res.status(400).json({
          status: 'error',
          message: 'Insufficient wallet balance'
        });
      }

      // 7) Create investment
      const newInvestment = await Investment.create({
        user: req.user.id,
        property: property._id,
        tokensPurchased,
        investmentAmount,
        tokenPrice: property.tokenPrice,
        status: 'Active'
      });

      // 8) Update property's available tokens
      property.availableTokens -= tokensPurchased;
      
      // Update funding percentage
      property.fundingPercentage = (property.totalTokens - property.availableTokens) / property.totalTokens;
      
      await property.save();

      // 9) Update user's wallet balance
      user.walletBalance -= investmentAmount;
      user.totalInvestments += investmentAmount;
      await user.save();

      // 10) Create transaction record
      await Transaction.create({
        user: req.user.id,
        type: 'Investment Purchase',
        amount: investmentAmount,
        status: 'Completed',
        description: `Investment in ${property.title}`,
        relatedEntity: {
          entityType: 'Investment',
          entityId: newInvestment._id
        },
        completedAt: Date.now()
      });

      res.status(201).json({
        status: 'success',
        data: {
          investment: newInvestment
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create sell order for investment tokens
  static async createSellOrder(req, res, next) {
    try {
      const investment = await Investment.findById(req.params.id);

      if (!investment) {
        return res.status(404).json({
          status: 'error',
          message: 'No investment found with that ID'
        });
      }

      // Check if user is the owner of the investment
      if (investment.user._id.toString() !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to sell this investment'
        });
      }

      // Check if investment is active
      if (investment.status !== 'Active') {
        return res.status(400).json({
          status: 'error',
          message: 'Only active investments can be sold'
        });
      }

      // Validate sell order quantity
      const quantity = parseInt(req.body.quantity);
      
      if (isNaN(quantity) || quantity <= 0 || quantity > investment.tokensPurchased) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid quantity. You can sell up to ${investment.tokensPurchased} tokens.`
        });
      }

      // Add sell order to investment
      investment.sellOrders.push({
        quantity,
        price: req.body.price,
        date: new Date(),
        status: 'Open'
      });

      await investment.save();

      res.status(201).json({
        status: 'success',
        data: {
          sellOrder: investment.sellOrders[investment.sellOrders.length - 1]
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel sell order
  static async cancelSellOrder(req, res, next) {
    try {
      const investment = await Investment.findOne({
        _id: req.params.investmentId,
        'sellOrders._id': req.params.orderId
      });

      if (!investment) {
        return res.status(404).json({
          status: 'error',
          message: 'No investment or sell order found with that ID'
        });
      }

      // Check if user is the owner of the investment
      if (investment.user._id.toString() !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to cancel this sell order'
        });
      }

      // Find the sell order
      const sellOrder = investment.sellOrders.id(req.params.orderId);

      if (!sellOrder) {
        return res.status(404).json({
          status: 'error',
          message: 'Sell order not found'
        });
      }

      // Check if sell order is still open
      if (sellOrder.status !== 'Open') {
        return res.status(400).json({
          status: 'error',
          message: `Cannot cancel order with status: ${sellOrder.status}`
        });
      }

      // Update sell order status
      sellOrder.status = 'Cancelled';
      await investment.save();

      res.status(200).json({
        status: 'success',
        data: {
          sellOrder
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get investment statistics
  static async getInvestmentStats(req, res, next) {
    try {
      const investmentCount = await Investment.countDocuments({ user: req.user.id });
      
      const stats = await Investment.aggregate([
        {
          $match: { user: req.user._id }
        },
        {
          $group: {
            _id: null,
            totalInvested: { $sum: '$investmentAmount' },
            totalCurrentValue: { $sum: '$currentValue' },
            avgInvestment: { $avg: '$investmentAmount' },
            minInvestment: { $min: '$investmentAmount' },
            maxInvestment: { $max: '$investmentAmount' }
          }
        }
      ]);

      // Get investment distribution by property category
      const categoryDistribution = await Investment.aggregate([
        {
          $match: { user: req.user._id }
        },
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'propertyData'
          }
        },
        {
          $unwind: '$propertyData'
        },
        {
          $group: {
            _id: '$propertyData.category',
            totalInvested: { $sum: '$investmentAmount' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            category: '$_id',
            totalInvested: 1,
            count: 1,
            _id: 0
          }
        }
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          investmentCount,
          stats: stats[0] || {
            totalInvested: 0,
            totalCurrentValue: 0,
            avgInvestment: 0,
            minInvestment: 0,
            maxInvestment: 0
          },
          categoryDistribution
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update investment value
  static async updateInvestmentValue(req, res, next) {
    try {
      const investment = await Investment.findById(req.params.id);

      if (!investment) {
        return res.status(404).json({
          status: 'error',
          message: 'No investment found with that ID'
        });
      }

      // Check if user is the owner of the property or has admin role
      const property = await Property.findById(investment.property);
      
      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'Property not found'
        });
      }

      if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to update this investment value'
        });
      }

      // Update the current value
      investment.currentValue = req.body.currentValue;
      await investment.save();

      res.status(200).json({
        status: 'success',
        data: {
          investment
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Add dividend to investment
  static async addDividend(req, res, next) {
    try {
      const investment = await Investment.findById(req.params.id);

      if (!investment) {
        return res.status(404).json({
          status: 'error',
          message: 'No investment found with that ID'
        });
      }

      // Check if user has permission (property owner or admin)
      const property = await Property.findById(investment.property);
      
      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'Property not found'
        });
      }

      if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to add dividends'
        });
      }

      // Add dividend to investment
      investment.dividends.push({
        amount: req.body.amount,
        date: new Date(),
        type: req.body.type || 'Rental'
      });

      await investment.save();

      // Create transaction record for dividend
      await Transaction.create({
        user: investment.user,
        type: 'Dividend',
        amount: req.body.amount,
        status: 'Completed',
        description: `Dividend payment for ${property.title}`,
        relatedEntity: {
          entityType: 'Investment',
          entityId: investment._id
        },
        completedAt: Date.now()
      });

      // Update user's wallet balance
      const user = await User.findById(investment.user);
      user.walletBalance += req.body.amount;
      await user.save();

      res.status(201).json({
        status: 'success',
        data: {
          dividend: investment.dividends[investment.dividends.length - 1]
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InvestmentController;