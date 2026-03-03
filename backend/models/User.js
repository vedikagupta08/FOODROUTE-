const mongoose = require('mongoose');

/**
 * User Schema
 * Stores user information including role, location, and preferences
 */
const userSchema = new mongoose.Schema({
  firebaseUID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['donor', 'receiver', 'volunteer', 'admin'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  // Location for matching (lat/lng)
  location: {
    latitude: {
      type: Number,
      required: function() {
        return this.role === 'receiver' || this.role === 'volunteer';
      }
    },
    longitude: {
      type: Number,
      required: function() {
        return this.role === 'receiver' || this.role === 'volunteer';
      }
    },
    address: String
  },
  // Receiver-specific fields
  capacity: {
    type: Number, // Maximum meals they can receive
    default: 0
  },
  isOpen: {
    type: Boolean, // Whether receiver is currently accepting donations
    default: true
  },
  // Volunteer-specific fields
  isAvailable: {
    type: Boolean, // Whether volunteer is available for assignments
    default: true
  },
  // Profile image URL
  profileImage: {
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

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
