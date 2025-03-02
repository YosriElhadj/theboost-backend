// src/controllers/propertyController.js
const Property = require('../models/Property');
const Investment = require('../models/Investment');

class PropertyController {
  // Get all properties
  static async getAllProperties(req, res, next) {
    try {
      // Build query
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach(el => delete queryObj[el]);

      // Advanced filtering
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      let query = Property.find(JSON.parse(queryStr));

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
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);

      // Execute query
      const properties = await query;

      // Send response
      res.status(200).json({
        status: 'success',
        results: properties.length,
        data: {
          properties
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get property by ID
  static async getProperty(req, res, next) {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'No property found with that ID'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          property
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new property
  static async createProperty(req, res, next) {
    try {
      // Add owner ID from authenticated user
      req.body.owner = req.user.id;

      const newProperty = await Property.create(req.body);

      res.status(201).json({
        status: 'success',
        data: {
          property: newProperty
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update property
  static async updateProperty(req, res, next) {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'No property found with that ID'
        });
      }

      // Check if user is the owner or has admin role
      if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to update this property'
        });
      }

      const updatedProperty = await Property.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { 
          new: true, 
          runValidators: true 
        }
      );

      res.status(200).json({
        status: 'success',
        data: {
          property: updatedProperty
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete property
  static async deleteProperty(req, res, next) {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'No property found with that ID'
        });
      }

      // Check if user is the owner or has admin role
      if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to delete this property'
        });
      }

      // Check if property has investments
      const hasInvestments = await Investment.exists({ property: req.params.id });
      
      if (hasInvestments && property.status !== 'Draft') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete property with active investments'
        });
      }

      await Property.findByIdAndDelete(req.params.id);

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  // Get featured properties
  static async getFeaturedProperties(req, res, next) {
    try {
      const properties = await Property.find({ isFeatured: true }).limit(6);

      res.status(200).json({
        status: 'success',
        results: properties.length,
        data: {
          properties
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get properties by category
  static async getPropertiesByCategory(req, res, next) {
    try {
      const properties = await Property.find({ category: req.params.category });

      res.status(200).json({
        status: 'success',
        results: properties.length,
        data: {
          properties
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get properties by owner
  static async getMyProperties(req, res, next) {
    try {
      const properties = await Property.find({ owner: req.user.id });

      res.status(200).json({
        status: 'success',
        results: properties.length,
        data: {
          properties
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get property investments
  static async getPropertyInvestments(req, res, next) {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'No property found with that ID'
        });
      }

      // Check if user is the owner or has admin role
      if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view these investments'
        });
      }

      const investments = await Investment.find({ property: req.params.id });

      res.status(200).json({
        status: 'success',
        results: investments.length,
        data: {
          investments
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update property funding status
  static async updateFundingStatus(req, res, next) {
    try {
      const property = await Property.findById(req.params.id);

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'No property found with that ID'
        });
      }

      // Check if user is the owner or has admin role
      if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to update this property'
        });
      }

      // Validate status transition
      const validStatusTransitions = {
        'Draft': ['Active', 'Funding'],
        'Active': ['Funding', 'Closed'],
        'Funding': ['Closed', 'Sold'],
        'Closed': ['Sold'],
        'Sold': []
      };

      if (!validStatusTransitions[property.status].includes(req.body.status)) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot transition from ${property.status} to ${req.body.status}`
        });
      }

      property.status = req.body.status;
      
      // If transitioning to Funding, set the investment window
      if (req.body.status === 'Funding') {
        property.investmentWindowStart = req.body.investmentWindowStart || new Date();
        property.investmentWindowEnd = req.body.investmentWindowEnd;
      }

      await property.save();

      res.status(200).json({
        status: 'success',
        data: {
          property
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PropertyController;