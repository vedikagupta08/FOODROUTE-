const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const FoodListing = require('../models/FoodListing');
const User = require('../models/User');
const { authenticate } = require('../services/firebaseAuth');
const { getRoute } = require('../services/mapboxService');
const { sendDeliveryStatusEmail } = require('../services/emailService');

/**
 * GET /api/delivery
 * Get all deliveries (with optional filters)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, volunteerId, receiverId, donorId } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (volunteerId) {
      query.volunteerId = volunteerId;
    }
    if (receiverId) {
      query.receiverId = receiverId;
    }
    if (donorId) {
      query.donorId = donorId;
    }

    const deliveries = await Delivery.find(query)
      .populate('foodListingId', 'foodName quantity urgency')
      .populate('donorId', 'name email phone')
      .populate('receiverId', 'name location')
      .populate('volunteerId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: deliveries.length,
      deliveries
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries',
      error: error.message
    });
  }
});

/**
 * GET /api/delivery/:id
 * Get a specific delivery
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('foodListingId', 'foodName quantity urgency packagingType imageUrl')
      .populate('donorId', 'name email phone location')
      .populate('receiverId', 'name email phone location capacity')
      .populate('volunteerId', 'name email phone location');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.json({
      success: true,
      delivery
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery',
      error: error.message
    });
  }
});

/**
 * GET /api/delivery/:id/route
 * Get optimized route for delivery
 */
router.get('/:id/route', authenticate, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // If route already calculated, return it
    if (delivery.route && delivery.route.distance) {
      return res.json({
        success: true,
        route: delivery.route,
        pickupLocation: delivery.pickupLocation,
        dropLocation: delivery.dropLocation,
        eta: delivery.eta
      });
    }

    // Calculate route using Mapbox
    const route = await getRoute(
      delivery.pickupLocation.latitude,
      delivery.pickupLocation.longitude,
      delivery.dropLocation.latitude,
      delivery.dropLocation.longitude
    );

    // Calculate ETA (current time + duration)
    const eta = new Date(Date.now() + route.duration * 1000);

    // Update delivery with route info
    delivery.route = route;
    delivery.eta = eta;
    await delivery.save();

    res.json({
      success: true,
      route,
      pickupLocation: delivery.pickupLocation,
      dropLocation: delivery.dropLocation,
      eta
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate route',
      error: error.message
    });
  }
});

/**
 * PUT /api/delivery/:id/status
 * Update delivery status
 */
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { uid } = req.user;

    const validStatuses = ['pending', 'picked', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const delivery = await Delivery.findById(req.params.id)
      .populate('volunteerId', 'firebaseUID');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Verify user has permission (volunteer assigned to delivery or admin)
    const user = await User.findOne({ firebaseUID: uid });
    const isVolunteer = delivery.volunteerId && 
      delivery.volunteerId.firebaseUID === uid;
    const isAdmin = user && user.role === 'admin';

    if (!isVolunteer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this delivery'
      });
    }

    // Update status and timestamps
    const oldStatus = delivery.status;
    delivery.status = status;

    if (status === 'picked' && !delivery.pickedAt) {
      delivery.pickedAt = new Date();
    }
    if (status === 'delivered' && !delivery.deliveredAt) {
      delivery.deliveredAt = new Date();

      // Update food listing status
      const foodListing = await FoodListing.findById(delivery.foodListingId);
      if (foodListing) {
        foodListing.status = 'delivered';
        await foodListing.save();
      }

      // Mark volunteer as available again
      if (delivery.volunteerId) {
        const volunteer = await User.findById(delivery.volunteerId._id);
        if (volunteer) {
          volunteer.isAvailable = true;
          await volunteer.save();
        }
      }
    }

    await delivery.save();

    // Send email notification for status change
    try {
      // Get food listing details for email
      const foodListing = await FoodListing.findById(delivery.foodListingId)
        .populate('donorId', 'name email');
      
      // Get receiver details
      const receiver = await User.findById(delivery.receiverId);
      
      // Prepare email data
      const emailData = {
        deliveryId: delivery._id,
        status: delivery.status,
        foodName: foodListing?.foodName,
        quantity: foodListing?.quantity,
        volunteerName: delivery.volunteerId?.name || 'Assigned Volunteer',
        eta: delivery.estimatedArrival || 'Calculating...'
      };

      // Send email to donor
      if (foodListing?.donorId?.email) {
        await sendDeliveryStatusEmail(foodListing.donorId.email, emailData);
      }

      // Send email to receiver
      if (receiver?.email) {
        await sendDeliveryStatusEmail(receiver.email, emailData);
      }

      console.log(`📧 Email notifications sent for delivery ${delivery._id} status: ${status}`);
    } catch (emailError) {
      console.error('❌ Failed to send email notifications:', emailError);
      // Don't fail the request if email fails
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.to(`delivery-${delivery._id}`).emit('delivery-status-updated', {
      deliveryId: delivery._id,
      status: delivery.status,
      oldStatus,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Delivery status updated successfully',
      delivery
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status',
      error: error.message
    });
  }
});

/**
 * GET /api/delivery/:id/volunteer-location
 * Get real-time volunteer location for tracking
 */
router.get('/:id/volunteer-location', authenticate, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('volunteerId', 'name email location');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // For demo purposes, return simulated location
    // In production, this would come from volunteer's mobile app GPS
    let location = null;
    
    if (delivery.status === 'picked' || delivery.status === 'in_transit') {
      // Simulate volunteer movement along the route
      const pickupLocation = delivery.pickupLocation;
      const dropLocation = delivery.dropLocation;
      
      // Calculate progress based on time elapsed
      const now = new Date();
      const pickupTime = delivery.pickedAt || now;
      const elapsed = (now - pickupTime) / (1000 * 60); // minutes
      const totalDuration = 30; // estimated 30 minutes total
      
      const progress = Math.min(elapsed / totalDuration, 1);
      
      // Interpolate position between pickup and drop
      location = {
        latitude: pickupLocation.latitude + (dropLocation.latitude - pickupLocation.latitude) * progress,
        longitude: pickupLocation.longitude + (dropLocation.longitude - pickupLocation.longitude) * progress,
        timestamp: new Date(),
        speed: 25 + Math.random() * 10, // Random speed between 25-35 km/h
        heading: Math.atan2(
          dropLocation.latitude - pickupLocation.latitude,
          dropLocation.longitude - pickupLocation.longitude
        ) * (180 / Math.PI)
      };
    }

    res.json({
      success: true,
      location,
      volunteer: delivery.volunteerId ? {
        name: delivery.volunteerId.name,
        phone: delivery.volunteerId.phone
      } : null,
      deliveryStatus: delivery.status,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Get volunteer location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get volunteer location',
      error: error.message
    });
  }
});

/**
 * PUT /api/delivery/:id/volunteer-location
 * Update volunteer location (called by volunteer's mobile app)
 */
router.put('/:id/volunteer-location', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;
    const { uid } = req.user;

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Verify user is the assigned volunteer
    const volunteer = await User.findOne({ firebaseUID: uid });
    if (!delivery.volunteerId || delivery.volunteerId.toString() !== volunteer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this delivery location'
      });
    }

    // Update volunteer's current location
    volunteer.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    await volunteer.save();

    // Store location in delivery for tracking
    delivery.currentLocation = {
      latitude,
      longitude,
      speed: speed || null,
      heading: heading || null,
      timestamp: new Date()
    };
    await delivery.save();

    // Emit real-time location update via Socket.IO
    const io = req.app.get('io');
    io.to(`delivery-${delivery._id}`).emit('volunteer-location-updated', {
      deliveryId: delivery._id,
      location: delivery.currentLocation,
      volunteer: {
        name: volunteer.name,
        phone: volunteer.phone
      }
    });

    res.json({
      success: true,
      message: 'Volunteer location updated successfully',
      location: delivery.currentLocation
    });

  } catch (error) {
    console.error('Update volunteer location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update volunteer location',
      error: error.message
    });
  }
});

module.exports = router;
