const mongoose = require('mongoose');

/**
 * FoodListing Schema
 * Stores surplus food postings from donors
 */
const foodListingSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  // Time when food was cooked/prepared
  timeCooked: {
    type: Date,
    required: true
  },
  // Location where food is available for pickup
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  packagingType: {
    type: String,
    enum: ['container', 'tray', 'bag', 'box', 'other'],
    required: true
  },
  imageUrl: {
    type: String
  },
  // Calculated urgency level
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
    default: 'low'
  },
  // Status of the listing
  status: {
    type: String,
    enum: ['available', 'assigned', 'requested', 'assigned_to_volunteer', 'picked_up', 'delivered', 'expired'],
    default: 'available',
    index: true
  },
  // Assigned receiver (if matched)
  assignedReceiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Assigned volunteer (if assigned)
  assignedVolunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate urgency before saving
foodListingSchema.pre('save', function(next) {
  if (this.timeCooked) {
    const hoursSinceCooked = (Date.now() - this.timeCooked.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCooked > 3) {
      this.urgency = 'high';
    } else if (hoursSinceCooked >= 1) {
      this.urgency = 'medium';
    } else {
      this.urgency = 'low';
    }
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FoodListing', foodListingSchema);
