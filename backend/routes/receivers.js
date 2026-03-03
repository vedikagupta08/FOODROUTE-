const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FoodListing = require('../models/FoodListing');
const { authenticate } = require('../services/firebaseAuth');
const { calculateDistance } = require('../services/mapboxService');

/**
 * GET /api/receivers/match/:foodListingId
 * Find best matching receivers for a food listing
 * Returns top 3 receivers ranked by distance
 */
router.get('/match/:foodListingId', authenticate, async (req, res) => {
  try {
    const foodListing = await FoodListing.findById(req.params.foodListingId);
    
    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    // Find all open receivers with capacity
    const receivers = await User.find({
      role: 'receiver',
      isOpen: true,
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });

    if (receivers.length === 0) {
      return res.json({
        success: true,
        message: 'No available receivers found',
        matches: []
      });
    }

    // Calculate distances and filter by capacity
    const matches = [];
    const foodLat = foodListing.location.latitude;
    const foodLng = foodListing.location.longitude;

    for (const receiver of receivers) {
      // Check if receiver has capacity
      if (receiver.capacity && receiver.capacity >= foodListing.quantity) {
        try {
          const distance = await calculateDistance(
            foodLat,
            foodLng,
            receiver.location.latitude,
            receiver.location.longitude
          );

          matches.push({
            receiverId: receiver._id,
            receiverName: receiver.name,
            receiverEmail: receiver.email,
            receiverPhone: receiver.phone,
            location: receiver.location,
            capacity: receiver.capacity,
            distance: Math.round(distance), // in meters
            distanceKm: Math.round(distance / 1000 * 10) / 10 // in km, rounded to 1 decimal
          });
        } catch (error) {
          console.error(`Error calculating distance for receiver ${receiver._id}:`, error);
        }
      }
    }

    // Sort by distance (nearest first) and take top 3
    matches.sort((a, b) => a.distance - b.distance);
    const topMatches = matches.slice(0, 3);

    res.json({
      success: true,
      message: `Found ${matches.length} matching receivers`,
      matches: topMatches,
      foodListing: {
        id: foodListing._id,
        foodName: foodListing.foodName,
        quantity: foodListing.quantity,
        urgency: foodListing.urgency
      }
    });
  } catch (error) {
    console.error('Receiver matching error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find matching receivers',
      error: error.message
    });
  }
});

/**
 * GET /api/receivers
 * Get all receivers
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const receivers = await User.find({ role: 'receiver' })
      .select('name email phone location capacity isOpen createdAt');

    res.json({
      success: true,
      count: receivers.length,
      receivers
    });
  } catch (error) {
    console.error('Get receivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receivers',
      error: error.message
    });
  }
});

/**
 * GET /api/receivers/:id
 * Get a specific receiver
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const receiver = await User.findById(req.params.id);

    if (!receiver || receiver.role !== 'receiver') {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    res.json({
      success: true,
      receiver
    });
  } catch (error) {
    console.error('Get receiver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receiver',
      error: error.message
    });
  }
});

/**
 * POST /api/receivers/assign
 * Assign a receiver to a food listing
 */
router.post('/assign', authenticate, async (req, res) => {
  try {
    const { foodListingId, receiverId } = req.body;

    if (!foodListingId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Food listing ID and receiver ID are required'
      });
    }

    const foodListing = await FoodListing.findById(foodListingId);
    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.role !== 'receiver') {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Update food listing
    foodListing.assignedReceiverId = receiverId;
    foodListing.status = 'assigned';
    await foodListing.save();

    res.json({
      success: true,
      message: 'Receiver assigned successfully',
      foodListing
    });
  } catch (error) {
    console.error('Assign receiver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign receiver',
      error: error.message
    });
  }
});

module.exports = router;
