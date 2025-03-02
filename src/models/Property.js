// src/models/Property.js
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A property must have a title'],
    trim: true,
    maxlength: [100, 'Property title must be less than or equal to 100 characters']
  },
  description: {
    type: String,
    required: [true, 'A property must have a description'],
    trim: true
  },
  location: {
    address: {
      type: String,
      required: [true, 'Property must have an address']
    },
    city: String,
    state: String,
    country: String,
    zipCode: String,
    coordinates: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      }
    }
  },
  category: {
    type: String,
    required: [true, 'A property must have a category'],
    enum: {
      values: [
        'Urban Development', 
        'Agricultural', 
        'Commercial', 
        'Residential', 
        'Conservation', 
        'Mixed-Use'
      ],
      message: 'Invalid property category'
    }
  },
  totalValue: {
    type: Number,
    required: [true, 'A property must have a total value']
  },
  minInvestment: {
    type: Number,
    required: [true, 'A property must have a minimum investment amount']
  },
  tokenPrice: {
    type: Number,
    required: [true, 'A property must have a token price']
  },
  availableTokens: {
    type: Number,
    required: [true, 'A property must specify available tokens']
  },
  totalTokens: {
    type: Number,
    required: [true, 'A property must specify total tokens']
  },
  projectedReturn: {
    type: Number,
    required: [true, 'A property must have a projected return percentage']
  },
  riskLevel: {
    type: String,
    required: [true, 'A property must have a risk level'],
    enum: {
      values: ['Low', 'Medium', 'Medium-High', 'High'],
      message: 'Risk level must be Low, Medium, Medium-High, or High'
    }
  },
  fundingPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Funding percentage cannot be negative'],
    max: [1, 'Funding percentage cannot exceed 100%']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['Prospectus', 'Title Deed', 'Environmental Report', 'Valuation Report']
    },
    url: {
      type: String,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+\.(pdf|doc|docx)$/i.test(v);
        },
        message: 'Please provide a valid document URL'
      }
    }
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Funding', 'Closed', 'Sold'],
    default: 'Draft'
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A property must have an owner']
  },
  blockchainTokenAddress: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  investmentWindowStart: Date,
  investmentWindowEnd: Date
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for investments
propertySchema.virtual('investments', {
  ref: 'Investment',
  foreignField: 'property',
  localField: '_id'
});

// Index for faster querying
propertySchema.index({ 
  category: 1, 
  riskLevel: 1, 
  projectedReturn: 1, 
  fundingPercentage: 1 
});

// Add method to check if investment is currently open
propertySchema.methods.isInvestmentOpen = function() {
  const now = new Date();
  return this.status === 'Funding' && 
         (!this.investmentWindowStart || now >= this.investmentWindowStart) &&
         (!this.investmentWindowEnd || now <= this.investmentWindowEnd);
};

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;