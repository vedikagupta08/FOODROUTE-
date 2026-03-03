const express = require('express');
const router = express.Router();
const FoodListing = require('../models/FoodListing');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const { authenticate } = require('../services/firebaseAuth');

/**
 * GET /api/dashboard/stats
 * Get overall platform statistics
 * Accessible by admin or for public dashboard
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await User.findOne({ firebaseUID: uid });

    // Check if user is admin (or allow all authenticated users for now)
    // In production, you might want to restrict this to admin only

    // Total food listings
    const totalFoodListings = await FoodListing.countDocuments();

    // Total meals delivered (sum of quantities from delivered listings)
    const deliveredListings = await FoodListing.find({ status: 'delivered' });
    const totalMealsDelivered = deliveredListings.reduce((sum, listing) => sum + listing.quantity, 0);

    // Active donors (donors who have created at least one listing)
    const activeDonors = await FoodListing.distinct('donorId');
    const activeDonorsCount = activeDonors.length;

    // Active volunteers (volunteers who have completed at least one delivery)
    const activeVolunteers = await Delivery.distinct('volunteerId', { status: 'delivered' });
    const activeVolunteersCount = activeVolunteers.length;

    // Completed deliveries
    const completedDeliveries = await Delivery.countDocuments({ status: 'delivered' });

    // Pending deliveries
    const pendingDeliveries = await Delivery.countDocuments({ status: 'pending' });

    // In transit deliveries
    const inTransitDeliveries = await Delivery.countDocuments({ status: 'in_transit' });

    // Food listings by urgency
    const highUrgency = await FoodListing.countDocuments({ urgency: 'high', status: 'available' });
    const mediumUrgency = await FoodListing.countDocuments({ urgency: 'medium', status: 'available' });
    const lowUrgency = await FoodListing.countDocuments({ urgency: 'low', status: 'available' });

    // Recent deliveries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentDeliveries = await Delivery.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      status: 'delivered'
    });

    res.json({
      success: true,
      stats: {
        totalFoodListings,
        totalMealsDelivered,
        activeDonors: activeDonorsCount,
        activeVolunteers: activeVolunteersCount,
        completedDeliveries,
        pendingDeliveries,
        inTransitDeliveries,
        urgencyBreakdown: {
          high: highUrgency,
          medium: mediumUrgency,
          low: lowUrgency
        },
        recentDeliveries
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/charts
 * Get data for charts (time series, etc.)
 */
router.get('/charts', authenticate, async (req, res) => {
  try {
    // Get deliveries grouped by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deliveries = await Delivery.find({
      createdAt: { $gte: thirtyDaysAgo },
      status: 'delivered'
    }).sort({ createdAt: 1 });

    // Group by date
    const deliveriesByDate = {};
    deliveries.forEach(delivery => {
      const date = new Date(delivery.createdAt).toISOString().split('T')[0];
      if (!deliveriesByDate[date]) {
        deliveriesByDate[date] = 0;
      }
      deliveriesByDate[date]++;
    });

    // Format for Chart.js
    const labels = Object.keys(deliveriesByDate).sort();
    const data = labels.map(date => deliveriesByDate[date]);

    // Get food listings by urgency
    const urgencyData = {
      high: await FoodListing.countDocuments({ urgency: 'high' }),
      medium: await FoodListing.countDocuments({ urgency: 'medium' }),
      low: await FoodListing.countDocuments({ urgency: 'low' })
    };

    // Get status breakdown
    const statusData = {
      available: await FoodListing.countDocuments({ status: 'available' }),
      assigned: await FoodListing.countDocuments({ status: 'assigned' }),
      picked: await FoodListing.countDocuments({ status: 'picked' }),
      delivered: await FoodListing.countDocuments({ status: 'delivered' }),
      expired: await FoodListing.countDocuments({ status: 'expired' })
    };

    res.json({
      success: true,
      charts: {
        deliveriesOverTime: {
          labels,
          data
        },
        urgencyBreakdown: {
          labels: ['High', 'Medium', 'Low'],
          data: [urgencyData.high, urgencyData.medium, urgencyData.low]
        },
        statusBreakdown: {
          labels: Object.keys(statusData).map(key => key.charAt(0).toUpperCase() + key.slice(1)),
          data: Object.values(statusData)
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
      error: error.message
    });
  }
});

module.exports = router;
