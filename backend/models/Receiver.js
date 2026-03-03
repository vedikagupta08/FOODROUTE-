const mongoose = require('mongoose');

/**
 * Receiver Schema
 * Stores receiver-specific information and preferences
 * Note: This extends User model with receiver-specific data
 */
const receiverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    trim: true
  },
  // Maximum capacity (in meals)
  maxCapacity: {
    type: Number,
    required: true,
    min: 1
  },
  // Current capacity being used
  currentCapacity: {
    type: Number,
    default: 0,
    min: 0
  },
  // Operating hours
  operatingHours: {
    open: String, // e.g., "09:00"
    close: String // e.g., "17:00"
  },
  // Days of week they operate
  operatingDays: {
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  // Whether currently accepting donations
  isOpen: {
    type: Boolean,
    default: true,
    index: true
  },
  // Types of food they accept
  acceptedFoodTypes: {
    type: [String],
    default: []
  },
  // Special requirements or notes
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

receiverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Receiver', receiverSchema);
