const mongoose = require('mongoose');

/**
 * Delivery Schema
 * Tracks delivery assignments and status
 */
const deliverySchema = new mongoose.Schema({
  foodListingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodListing',
    required: true,
    index: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  // Delivery status
  status: {
    type: String,
    enum: ['pending', 'picked', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Pickup location (from food listing)
  pickupLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  // Drop location (receiver location)
  dropLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  // Route information from Mapbox
  route: {
    distance: Number, // in meters
    duration: Number, // in seconds
    geometry: String // GeoJSON string
  },
  // Estimated time of arrival
  eta: {
    type: Date
  },
  // Actual pickup time
  pickedAt: {
    type: Date
  },
  // Actual delivery time
  deliveredAt: {
    type: Date
  },
  // Volunteer acceptance timestamp
  acceptedAt: {
    type: Date
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

deliverySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
