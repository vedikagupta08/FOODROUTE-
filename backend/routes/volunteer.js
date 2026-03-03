const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FoodListing = require('../models/FoodListing');
const Delivery = require('../models/Delivery');
const { authenticate } = require('../services/firebaseAuth');
const { calculateDistance } = require('../services/mapboxService');

/**
 * GET /api/volunteer/available
 * Get all available volunteers
 */
router.get('/available', authenticate, async (req, res) => {
  try {
    const volunteers = await User.find({
      role: 'volunteer',
      isAvailable: true,
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    }).select('name email phone location isAvailable');

    res.json({
      success: true,
      count: volunteers.length,
      volunteers
    });
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteers',
      error: error.message
    });
  }
});

/**
 * GET /api/volunteer/nearby/:foodListingId
 * Find nearby volunteers for a food listing
 */
router.get('/nearby/:foodListingId', authenticate, async (req, res) => {
  try {
    const foodListing = await FoodListing.findById(req.params.foodListingId)
      .populate('assignedReceiverId', 'location');

    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    if (!foodListing.assignedReceiverId) {
      return res.status(400).json({
        success: false,
        message: 'No receiver assigned to this food listing'
      });
    }

    // Find available volunteers
    const volunteers = await User.find({
      role: 'volunteer',
      isAvailable: true,
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });

    if (volunteers.length === 0) {
      return res.json({
        success: true,
        message: 'No available volunteers found',
        nearbyVolunteers: []
      });
    }

    // Calculate distances from pickup location
    const pickupLat = foodListing.location.latitude;
    const pickupLng = foodListing.location.longitude;
    const nearbyVolunteers = [];

    for (const volunteer of volunteers) {
      try {
        const distance = await calculateDistance(
          pickupLat,
          pickupLng,
          volunteer.location.latitude,
          volunteer.location.longitude
        );

        nearbyVolunteers.push({
          volunteerId: volunteer._id,
          volunteerName: volunteer.name,
          volunteerEmail: volunteer.email,
          volunteerPhone: volunteer.phone,
          location: volunteer.location,
          distance: Math.round(distance),
          distanceKm: Math.round(distance / 1000 * 10) / 10
        });
      } catch (error) {
        console.error(`Error calculating distance for volunteer ${volunteer._id}:`, error);
      }
    }

    // Sort by distance (nearest first)
    nearbyVolunteers.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      message: `Found ${nearbyVolunteers.length} nearby volunteers`,
      nearbyVolunteers,
      foodListing: {
        id: foodListing._id,
        foodName: foodListing.foodName,
        pickupLocation: foodListing.location,
        receiverLocation: foodListing.assignedReceiverId.location
      }
    });
  } catch (error) {
    console.error('Find nearby volunteers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby volunteers',
      error: error.message
    });
  }
});

/**
 * POST /api/volunteer/accept
 * Volunteer accepts a delivery assignment
 */
router.post('/accept', authenticate, async (req, res) => {
  try {
    const { foodListingId } = req.body;
    const { uid } = req.user;

    const volunteer = await User.findOne({ firebaseUID: uid });
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only volunteers can accept assignments'
      });
    }

    if (!volunteer.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer is not available'
      });
    }

    const foodListing = await FoodListing.findById(foodListingId)
      .populate('assignedReceiverId', 'location');

    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    if (foodListing.status !== 'assigned' || !foodListing.assignedReceiverId) {
      return res.status(400).json({
        success: false,
        message: 'Food listing must have an assigned receiver'
      });
    }

    // Check if already assigned to another volunteer
    if (foodListing.assignedVolunteerId) {
      return res.status(400).json({
        success: false,
        message: 'This food listing is already assigned to a volunteer'
      });
    }

    // Assign volunteer
    foodListing.assignedVolunteerId = volunteer._id;
    foodListing.status = 'assigned';
    await foodListing.save();

    // Create delivery record
    const delivery = new Delivery({
      foodListingId: foodListing._id,
      donorId: foodListing.donorId,
      receiverId: foodListing.assignedReceiverId._id,
      volunteerId: volunteer._id,
      status: 'pending',
      pickupLocation: foodListing.location,
      dropLocation: foodListing.assignedReceiverId.location,
      acceptedAt: new Date()
    });
    await delivery.save();

    // Mark volunteer as unavailable
    volunteer.isAvailable = false;
    await volunteer.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('delivery-assigned', {
      deliveryId: delivery._id,
      foodListingId: foodListing._id,
      volunteerId: volunteer._id
    });

    res.json({
      success: true,
      message: 'Delivery assignment accepted',
      delivery,
      foodListing
    });
  } catch (error) {
    console.error('Accept assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept assignment',
      error: error.message
    });
  }
});

/**
 * PUT /api/volunteer/availability
 * Update volunteer availability status
 */
router.put('/availability', authenticate, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const { uid } = req.user;

    const volunteer = await User.findOne({ firebaseUID: uid });
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only volunteers can update availability'
      });
    }

    volunteer.isAvailable = isAvailable !== undefined ? isAvailable : volunteer.isAvailable;
    await volunteer.save();

    res.json({
      success: true,
      message: 'Availability updated successfully',
      volunteer: {
        _id: volunteer._id,
        name: volunteer.name,
        isAvailable: volunteer.isAvailable
      }
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: error.message
    });
  }
});

module.exports = router;
