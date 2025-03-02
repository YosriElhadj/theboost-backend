// src/services/investmentService.js
const Investment = require('../models/Investment');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const blockchainService = require('../utils/blockchain');

class InvestmentService {
  // Get user investments
  static async getUserInvestments(userId) {
    // Get investments
    const investments = await Investment.find({ user: userId });
    
    // Calculate investment stats
    const stats = await Investment.calculateUserTotalInvestment(userId);
    
    return { investments, stats };
  }

  // Get investment by ID
  static async getInvestmentById(investmentId, userId) {
    const investment = await Investment.findById(investmentId);
    
    if (!investment) {
      throw new Error('Investment not found');
    }
    
    // Check if user is the owner of the investment
    if (investment.user._id.toString() !== userId) {
      throw new Error('You do not have permission to view this investment');
    }
    
    return investment;
  }

  // Create new investment
  static async createInvestment(investmentData, userId) {
    // Get property details
    const property = await Property.findById(investmentData.property);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if property is open for investment
    if (!property.isInvestmentOpen()) {
      throw new Error('This property is not open for investment at this time');
    }
    
    // Calculate tokens and amount
    const tokensPurchased = investmentData.tokensPurchased || 
      Math.floor(investmentData.investmentAmount / property.tokenPrice);
    
    const investmentAmount = investmentData.investmentAmount || 
      (tokensPurchased * property.tokenPrice);
    
    if (tokensPurchased <= 0) {
      throw new Error('Invalid number of tokens requested');
    }
    
    // Check if enough tokens are available
    if (tokensPurchased > property.availableTokens) {
      throw new Error(`Only ${property.availableTokens} tokens available`);
    }
    
    // Check minimum investment requirement
    if (investmentAmount < property.minInvestment) {
      throw new Error(`Minimum investment amount is ${property.minInvestment}`);
    }
    
    // Check if user has sufficient wallet balance
    const user = await User.findById(userId);
    
    if (user.walletBalance < investmentAmount) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Create investment
    const newInvestment = await Investment.create({
      user: userId,
      property: property._id,
      tokensPurchased,
      investmentAmount,
      tokenPrice: property.tokenPrice,
      status: 'Active'
    });
    
    // Update property's available tokens
    property.availableTokens -= tokensPurchased;
    
    // Update funding percentage
    property.fundingPercentage = (property.totalTokens - property.availableTokens) / property.totalTokens;
    
    await property.save();
    
    // Update user's wallet balance
    user.walletBalance -= investmentAmount;
    user.totalInvestments += investmentAmount;
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      user: userId,
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
    
    // If property has blockchain token, record on blockchain
    if (property.blockchainTokenAddress) {
      try {
        // This would integrate with blockchain service
        // const txHash = await blockchainService.transferTokens(...);
        // newInvestment.blockchainTransactionHash = txHash;
        // await newInvestment.save();
      } catch (error) {
        console.error('Blockchain transaction failed:', error);
        // Still proceed with investment despite blockchain failure
      }
    }
    
    return newInvestment;
  }

  // Create sell order
  static async createSellOrder(investmentId, orderData, userId) {
    const investment = await Investment.findById(investmentId);
    
    if (!investment) {
      throw new Error('Investment not found');
    }
    
    // Check if user is the owner of the investment
    if (investment.user._id.toString() !== userId) {
      throw new Error('You do not have permission to sell this investment');
    }
    
    // Check if investment is active
    if (investment.status !== 'Active') {
      throw new Error('Only active investments can be sold');
    }
    
    // Validate sell order quantity
    const quantity = parseInt(orderData.quantity);
    
    if (isNaN(quantity) || quantity <= 0 || quantity > investment.tokensPurchased) {
      throw new Error(`Invalid quantity. You can sell up to ${investment.tokensPurchased} tokens.`);
    }
    
    // Add sell order to investment
    investment.sellOrders.push({
      quantity,
      price: orderData.price,
      date: new Date(),
      status: 'Open'
    });
    
    await investment.save();
    
    return investment.sellOrders[investment.sellOrders.length - 1];
  }

  // Cancel sell order
  static async cancelSellOrder(investmentId, orderId, userId) {
    const investment = await Investment.findOne({
      _id: investmentId,
      'sellOrders._id': orderId
    });
    
    if (!investment) {
      throw new Error('Investment or sell order not found');
    }
    
    // Check if user is the owner of the investment
    if (investment.user._id.toString() !== userId) {
      throw new Error('You do not have permission to cancel this sell order');
    }
    
    // Find the sell order
    const sellOrder = investment.sellOrders.id(orderId);
    
    if (!sellOrder) {
      throw new Error('Sell order not found');
    }
    
    // Check if sell order is still open
    if (sellOrder.status !== 'Open') {
      throw new Error(`Cannot cancel order with status: ${sellOrder.status}`);
    }
    
    // Update sell order status
    sellOrder.status = 'Cancelled';
    await investment.save();
    
    return sellOrder;
  }

  // Update investment value
  static async updateInvestmentValue(investmentId, newValue, userId) {
    const investment = await Investment.findById(investmentId);
    
    if (!investment) {
      throw new Error('Investment not found');
    }
    
    // Check if user has permission (property owner or admin)
    const property = await Property.findById(investment.property);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to update this investment value');
    }
    
    // Update the current value
    investment.currentValue = newValue;
    await investment.save();
    
    return investment;
  }

  // Add dividend to investment
  static async addDividend(investmentId, dividendData, userId) {
    const investment = await Investment.findById(investmentId);
    
    if (!investment) {
      throw new Error('Investment not found');
    }
    
    // Check if user has permission (property owner or admin)
    const property = await Property.findById(investment.property);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to add dividends');
    }
    
    // Add dividend to investment
    investment.dividends.push({
      amount: dividendData.amount,
      date: new Date(),
      type: dividendData.type || 'Rental'
    });
    
    await investment.save();
    
    // Create transaction record for dividend
    await Transaction.create({
      user: investment.user,
      type: 'Dividend',
      amount: dividendData.amount,
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
    user.walletBalance += dividendData.amount;
    await user.save();
    
    return investment.dividends[investment.dividends.length - 1];
  }

  // Get investment statistics
  static async getInvestmentStats(userId) {
    const investmentCount = await Investment.countDocuments({ user: userId });
    
    const stats = await Investment.aggregate([
      {
        $match: { user: userId }
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
        $match: { user: userId }
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
    
    // Get monthly returns
    const monthlyReturns = await Investment.aggregate([
      {
        $match: { user: userId }
      },
      {
        $unwind: '$dividends'
      },
      {
        $group: {
          _id: {
            year: { $year: '$dividends.date' },
            month: { $month: '$dividends.date' }
          },
          totalReturns: { $sum: '$dividends.amount' }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalReturns: 1
        }
      },
      {
        $sort: { year: 1, month: 1 }
      }
    ]);
    
    return {
      investmentCount,
      stats: stats[0] || {
        totalInvested: 0,
        totalCurrentValue: 0,
        avgInvestment: 0,
        minInvestment: 0,
        maxInvestment: 0
      },
      categoryDistribution,
      monthlyReturns
    };
  }

  // Get active sell orders
  static async getActiveSellOrders() {
    const investments = await Investment.find({
      'sellOrders.status': 'Open'
    });
    
    const activeSellOrders = [];
    
    investments.forEach(investment => {
      investment.sellOrders.forEach(order => {
        if (order.status === 'Open') {
          activeSellOrders.push({
            orderId: order._id,
            investmentId: investment._id,
            property: investment.property,
            user: investment.user,
            quantity: order.quantity,
            price: order.price,
            date: order.date
          });
        }
      });
    });
    
    return activeSellOrders;
  }
}

module.exports = InvestmentService;