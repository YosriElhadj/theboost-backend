// src/services/propertyService.js
const Property = require('../models/Property');
const Investment = require('../models/Investment');
const blockchainService = require('../utils/blockchain');

class PropertyService {
  // Create new property
  static async createProperty(propertyData, userId) {
    // Add owner ID
    propertyData.owner = userId;
    
    // Create property
    const property = await Property.create(propertyData);
    
    return property;
  }

  // Get property by ID
  static async getPropertyById(propertyId) {
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    return property;
  }

  // Update property
  static async updateProperty(propertyId, updateData, userId) {
    // Get property to check ownership
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if user is the owner
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to update this property');
    }
    
    // Update property
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    return updatedProperty;
  }

  // Delete property
  static async deleteProperty(propertyId, userId) {
    // Get property to check ownership
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if user is the owner
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to delete this property');
    }
    
    // Check if property has investments
    const hasInvestments = await Investment.exists({ property: propertyId });
    
    if (hasInvestments && property.status !== 'Draft') {
      throw new Error('Cannot delete property with active investments');
    }
    
    await Property.findByIdAndDelete(propertyId);
    
    return { success: true };
  }

  // Get properties with filters and pagination
  static async getProperties(queryParams, pagination = {}) {
    // Extract pagination params
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = Property.find(queryParams);
    
    // Apply pagination
    query = query.skip(skip).limit(limit);
    
    // Execute query
    const properties = await query;
    const total = await Property.countDocuments(queryParams);
    
    return {
      properties,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get featured properties
  static async getFeaturedProperties() {
    const properties = await Property.find({ isFeatured: true }).limit(6);
    return properties;
  }

  // Get properties by owner
  static async getPropertiesByOwner(userId) {
    const properties = await Property.find({ owner: userId });
    return properties;
  }

  // Tokenize property on blockchain
  static async tokenizeProperty(propertyId, userId) {
    // Get property
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if user is the owner
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to tokenize this property');
    }
    
    // Check if property is already tokenized
    if (property.blockchainTokenAddress) {
      throw new Error('Property is already tokenized');
    }
    
    // Create token on blockchain
    const propertySymbol = property.title
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
    
    const tokenResult = await blockchainService.createPropertyToken(
      propertyId.toString(),
      property.totalTokens,
      property.title,
      propertySymbol
    );
    
    // Update property with token address
    property.blockchainTokenAddress = tokenResult.tokenAddress;
    await property.save();
    
    return {
      property,
      transactionHash: tokenResult.transactionHash
    };
  }

  // Update property funding status
  static async updateFundingStatus(propertyId, status, userId, windowDates = {}) {
    // Get property
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if user is the owner
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to update this property');
    }
    
    // Validate status transition
    const validStatusTransitions = {
      'Draft': ['Active', 'Funding'],
      'Active': ['Funding', 'Closed'],
      'Funding': ['Closed', 'Sold'],
      'Closed': ['Sold'],
      'Sold': []
    };
    
    if (!validStatusTransitions[property.status].includes(status)) {
      throw new Error(`Cannot transition from ${property.status} to ${status}`);
    }
    
    // Update status
    property.status = status;
    
    // If transitioning to Funding, set the investment window
    if (status === 'Funding') {
      property.investmentWindowStart = windowDates.start || new Date();
      property.investmentWindowEnd = windowDates.end;
    }
    
    await property.save();
    
    return property;
  }

  // Get property investments
  static async getPropertyInvestments(propertyId, userId) {
    // Get property to check ownership
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if user is the owner
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to view these investments');
    }
    
    // Get investments
    const investments = await Investment.find({ property: propertyId });
    
    return investments;
  }

  // Get property metrics/analytics
  static async getPropertyMetrics(propertyId, userId) {
    // Get property to check ownership
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if user is the owner
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to view these metrics');
    }
    
    // Get investment metrics
    const investmentMetrics = await Investment.aggregate([
      {
        $match: { property: property._id }
      },
      {
        $group: {
          _id: null,
          totalInvestments: { $sum: '$investmentAmount' },
          totalInvestors: { $addToSet: '$user' },
          averageInvestment: { $avg: '$investmentAmount' },
          totalTokensSold: { $sum: '$tokensPurchased' }
        }
      },
      {
        $project: {
          _id: 0,
          totalInvestments: 1,
          totalInvestors: { $size: '$totalInvestors' },
          averageInvestment: 1,
          totalTokensSold: 1
        }
      }
    ]);
    
    // Get daily investment activity
    const investmentActivity = await Investment.aggregate([
      {
        $match: { property: property._id }
      },
      {
        $group: {
          _id: {
            year: { $year: '$purchaseDate' },
            month: { $month: '$purchaseDate' },
            day: { $dayOfMonth: '$purchaseDate' }
          },
          investmentAmount: { $sum: '$investmentAmount' },
          tokensPurchased: { $sum: '$tokensPurchased' },
          investors: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          investmentAmount: 1,
          tokensPurchased: 1,
          uniqueInvestors: { $size: '$investors' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);
    
    return {
      property: {
        title: property.title,
        totalValue: property.totalValue,
        totalTokens: property.totalTokens,
        availableTokens: property.availableTokens,
        fundingPercentage: property.fundingPercentage,
        status: property.status
      },
      investmentMetrics: investmentMetrics[0] || {
        totalInvestments: 0,
        totalInvestors: 0,
        averageInvestment: 0,
        totalTokensSold: 0
      },
      investmentActivity
    };
  }
  
  // Add document to property
  static async addPropertyDocument(propertyId, document, userId) {
    // Get property to check ownership
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Check if user is the owner
    if (property.owner.toString() !== userId) {
      throw new Error('You do not have permission to update this property');
    }
    
    // Validate document type
    const validTypes = ['Prospectus', 'Title Deed', 'Environmental Report', 'Valuation Report'];
    
    if (!validTypes.includes(document.type)) {
      throw new Error('Invalid document type');
    }
    
    // Add document to property
    property.documents.push({
      type: document.type,
      url: document.url
    });
    
    await property.save();
    
    return property;
  }
  
  // Search properties
  static async searchProperties(searchParams) {
    const { query, category, minPrice, maxPrice, location, status } = searchParams;
    
    // Build search query
    const searchQuery = {};
    
    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (category) {
      searchQuery.category = category;
    }
    
    if (minPrice || maxPrice) {
      searchQuery.tokenPrice = {};
      if (minPrice) searchQuery.tokenPrice.$gte = minPrice;
      if (maxPrice) searchQuery.tokenPrice.$lte = maxPrice;
    }
    
    if (location) {
      searchQuery['location.city'] = { $regex: location, $options: 'i' };
    }
    
    if (status) {
      searchQuery.status = status;
    }
    
    // Only return active or funding properties
    if (!status) {
      searchQuery.status = { $in: ['Active', 'Funding'] };
    }
    
    // Execute search
    const properties = await Property.find(searchQuery)
      .sort('-createdAt')
      .limit(20);
    
    return properties;
  }
}

module.exports = PropertyService;