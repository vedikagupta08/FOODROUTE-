const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const FoodListing = require('../models/FoodListing');
const User = require('../models/User');
const { authenticate } = require('../services/firebaseAuth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendFoodListingNotification } = require('../services/emailService');

// Serve uploaded images
router.use('/uploads', express.static('uploads'));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/food-images';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * SMART RECEIVER MATCHING SYSTEM
 * Finds the best receivers for food donations based on multiple factors
 */
const findBestReceivers = async (foodListing) => {
  try {
    console.log('🔍 Starting smart receiver matching...');
    
    // Get all eligible receivers (open and available)
    const eligibleReceivers = await User.find({
      role: 'receiver',
      isOpen: true,
      location: { $exists: true }
    });

    if (eligibleReceivers.length === 0) {
      console.log('❌ No eligible receivers found');
      return [];
    }

    console.log(`📊 Found ${eligibleReceivers.length} eligible receivers`);

    // Calculate distance and score for each receiver
    const receiversWithScores = await Promise.all(
      eligibleReceivers.map(async (receiver) => {
        // Calculate distance using Haversine formula
        const distance = await calculateDistance(
          foodListing.location.latitude,
          foodListing.location.longitude,
          receiver.location.latitude,
          receiver.location.longitude
        );

        // 🎯 UPGRADE 1: Use remaining capacity instead of total capacity
        const currentLoad = receiver.currentLoad || 0; // Track current food assignments
        const remainingCapacity = Math.max(0, receiver.capacity - currentLoad);
        const capacityScore = Math.min((remainingCapacity / 100) * 100, 100);

        // 🎯 UPGRADE 2: Minimum distance filter - reject beyond 30km
        if (distance > 30) {
          return null; // Skip receivers too far away
        }

        // Calculate urgency score (0-100)
        const urgencyScore = foodListing.urgency === 'high' ? 100 : 
                           foodListing.urgency === 'medium' ? 60 : 30;

        // 🎯 UPGRADE 3: Improved distance scoring with exponential decay
        const distanceScore = 100 * Math.exp(-distance / 20);

        // 🎯 UPGRADE 4: Time-to-Reach vs Urgency interaction
        let finalDistanceScore = distanceScore;
        if (foodListing.urgency === 'high' && distance > 15) {
          // Extra penalty for high urgency + long distance
          finalDistanceScore = distanceScore * 0.6; // 40% penalty
        } else if (foodListing.urgency === 'medium' && distance > 20) {
          finalDistanceScore = distanceScore * 0.8; // 20% penalty
        }

        // 🎯 UPGRADE 5: Fairness distribution - reduce score if receiver got recent assignments
        let fairnessScore = 100;
        const recentAssignments = receiver.recentAssignments || 0;
        if (recentAssignments >= 5) {
          fairnessScore = 70; // 30% reduction
        } else if (recentAssignments >= 3) {
          fairnessScore = 85; // 15% reduction
        }

        // Calculate total weighted score
        const totalScore = (
          (finalDistanceScore * 0.4) +     // 40% weight to distance
          (capacityScore * 0.3) +        // 30% weight to capacity
          (urgencyScore * 0.3)           // 30% weight to urgency
        ) * (fairnessScore / 100);         // Apply fairness factor

        return {
          receiver,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          remainingCapacity,
          capacityScore: Math.round(capacityScore),
          urgencyScore,
          distanceScore: Math.round(finalDistanceScore),
          fairnessScore,
          totalScore: Math.round(totalScore)
        };
      })
    );

    // Filter out null receivers (those beyond max distance)
    const validReceivers = receiversWithScores.filter(item => item !== null);

    // Sort by total score (highest first)
    const rankedReceivers = validReceivers.sort((a, b) => b.totalScore - a.totalScore);

    // Return top 3 receivers
    const topReceivers = rankedReceivers.slice(0, 3);

    console.log(`🏆 Ranked ${rankedReceivers.length} receivers, returning top ${topReceivers.length}`);

    return topReceivers.map(item => ({
      ...item.receiver.toObject(),
      matchingScore: item.totalScore,
      distance: item.distance,
      matchReason: getMatchReason(item)
    }));
  } catch (error) {
    console.error('❌ Error in smart receiver matching:', error);
    return [];
  }
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Get match reason based on scoring
 */
const getMatchReason = (item) => {
  const reasons = [];
  
  if (item.distanceScore >= 80) reasons.push('Very close location');
  else if (item.distanceScore >= 60) reasons.push('Close location');
  
  if (item.capacityScore >= 80) reasons.push('High capacity');
  else if (item.capacityScore >= 60) reasons.push('Good capacity');
  
  if (item.urgencyScore >= 80) reasons.push('High urgency match');
  
  if (reasons.length === 0) reasons.push('Available receiver');
  
  return reasons.join(', ');
};

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Helper function to create food listing
 */
const createFoodListing = async (req, res, user) => {
  // Check if user is donor
  if (user.role !== 'donor' && user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only donors can create food listings'
    });
  }

  // Handle image URL
  let imageUrl = null;
  if (req.file) {
    // Create a public URL for the uploaded image
    imageUrl = `/uploads/food-images/${req.file.filename}`;
    console.log("📷 Image uploaded:", imageUrl);
  } else if (req.body.imageUrl) {
    imageUrl = req.body.imageUrl;
  }

  // Calculate urgency based on time cooked
  const hoursSinceCooked = (Date.now() - new Date(req.body.timeCooked)) / (1000 * 60 * 60);
  let urgency = 'low';
  if (hoursSinceCooked > 3) {
    urgency = 'high';
  } else if (hoursSinceCooked > 1) {
    urgency = 'medium';
  }

  // Create food listing
  const foodData = {
    donorId: user._id,
    foodName: req.body.foodName,
    quantity: req.body.quantity,
    timeCooked: new Date(req.body.timeCooked),
    location: req.body.location,
    packagingType: req.body.packagingType,
    imageUrl: imageUrl,
    urgency: urgency,
    status: 'available'
  };

  const foodListing = new FoodListing(foodData);
  await foodListing.save();

  // Populate donor info
  await foodListing.populate('donorId', 'name email phone');

  // Send email notifications to matched receivers using smart matching
  try {
    // Find best matched receivers using smart matching system
    const matchedReceivers = await findBestReceivers(foodListing);

    if (matchedReceivers.length > 0) {
      await sendFoodListingNotification(matchedReceivers, foodListing);
      console.log(`🎯 Smart matching found ${matchedReceivers.length} best receivers`);
      
      // Store matched receivers for later reference
      foodListing.matchedReceivers = matchedReceivers.map(r => r._id);
      await foodListing.save();
    } else {
      console.log('❌ No suitable receivers found for this food listing');
    }
  } catch (emailError) {
    console.error('❌ Failed to send smart matching notifications:', emailError);
    // Don't fail the request if email fails
  }

  res.status(201).json({
    success: true,
    message: 'Food listing created successfully',
    foodListing,
    matchedReceivers: matchedReceivers || []
  });
};

/**
 * POST /api/food
 * Create a new food listing
 * Only donors can create food listings
 */
router.post('/', 
  authenticate,
  upload.single('foodImage'),
  [
    body('foodName').trim().notEmpty().withMessage('Food name is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('timeCooked').isISO8601().withMessage('Valid time cooked is required'),
    body('location.latitude').isFloat().withMessage('Valid latitude is required'),
    body('location.longitude').isFloat().withMessage('Valid longitude is required'),
    body('packagingType').isIn(['container', 'tray', 'bag', 'box', 'other']).withMessage('Valid packaging type is required')
  ],
  async (req, res) => {
    try {
      console.log("🍽 POST /api/food request received");
      console.log("📤 Request body:", req.body);
      console.log("📷 Uploaded file:", req.file);
      
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Get authenticated user
      const { uid } = req.user;
      console.log("👤 User UID:", uid);
      
      // Find user in database
      let user = await User.findOne({ firebaseUID: uid });
      
      if (!user) {
        console.log("⚠️ User not found in database, checking for fallback user");
        
        // Check if this is a fallback user from auth middleware
        if (req.user && req.user.email && req.user.role) {
          console.log("🔄 Using fallback user for food listing creation");
          
          // Create a temporary user object for food listing creation
          user = {
            _id: req.user._id,
            email: req.user.email,
            role: req.user.role,
            firebaseUID: uid,
            name: req.user.email.split('@')[0],
            phone: '9111111111',
            location: {
              latitude: 26.2062,
              longitude: 78.2036,
              address: 'Govindpuri, Gwalior'
            },
            capacity: 50,
            isOpen: true,
            isAvailable: true
          };
          
          console.log("✅ Using fallback user:", user.email, "Role:", user.role);
        } else {
          // Clean up uploaded file if user not found
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(404).json({
            success: false,
            message: 'User not found. Please complete registration first.'
          });
        }
      }

      console.log("✅ User found:", user.email, "Role:", user.role);
      
      // Continue with real user
      return createFoodListing(req, res, user);
      
    } catch (error) {
      console.error('Create food listing error:', error);
      // Clean up uploaded file if error occurs
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: 'Failed to create food listing',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/food
 * Get all food listings (with filters)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    console.log("🔍 GET /api/food request received");
    console.log("👤 User:", req.user);
    
    // Check for expired food and update status
    const now = new Date();
    await FoodListing.updateMany(
      {
        status: { $nin: ['delivered', 'expired'] },
        timeCooked: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // 24 hours ago
      },
      { status: 'expired' }
    );
    
    const { status, urgency, donorId } = req.query;
    const query = {};

    console.log("📋 Query params:", { status, urgency, donorId });

    if (status) {
      query.status = status;
    }
    if (urgency) {
      query.urgency = urgency;
    }
    if (donorId) {
      query.donorId = donorId;
    }

    // Exclude expired items unless explicitly requested
    if (!status || status !== 'expired') {
      query.status = query.status || { $nin: ['expired'] };
    }

    console.log("🔍 MongoDB query:", query);

    const rawListings = await FoodListing.find(query).sort({ createdAt: -1 }).lean();

    console.log("📦 Found food listings:", rawListings.length);

    const donorIds = [];
    const receiverIds = [];
    const volunteerIds = [];
    for (const doc of rawListings) {
      try {
        if (doc.donorId && mongoose.Types.ObjectId.isValid(doc.donorId)) {
          donorIds.push(doc.donorId);
        }
        if (doc.assignedReceiverId && mongoose.Types.ObjectId.isValid(doc.assignedReceiverId)) {
          receiverIds.push(doc.assignedReceiverId);
        }
        if (doc.assignedVolunteerId && mongoose.Types.ObjectId.isValid(doc.assignedVolunteerId)) {
          volunteerIds.push(doc.assignedVolunteerId);
        }
      } catch (e) {
        // skip bad refs
      }
    }

    const [donors, receivers, volunteers] = await Promise.all([
      donorIds.length ? User.find({ _id: { $in: donorIds } }).select('name email phone').lean() : [],
      receiverIds.length ? User.find({ _id: { $in: receiverIds } }).select('name location').lean() : [],
      volunteerIds.length ? User.find({ _id: { $in: volunteerIds } }).select('name phone').lean() : [],
    ]);

    const donorMap = Object.fromEntries((donors || []).map((d) => [String(d._id), d]));
    const receiverMap = Object.fromEntries((receivers || []).map((r) => [String(r._id), r]));
    const volunteerMap = Object.fromEntries((volunteers || []).map((v) => [String(v._id), v]));

    const foodListings = rawListings.map((listing) => {
      const did = listing.donorId ? String(listing.donorId) : null;
      const rid = listing.assignedReceiverId ? String(listing.assignedReceiverId) : null;
      const vid = listing.assignedVolunteerId ? String(listing.assignedVolunteerId) : null;
      return {
        ...listing,
        donorId: did ? (donorMap[did] || listing.donorId) : null,
        assignedReceiverId: rid ? (receiverMap[rid] || listing.assignedReceiverId) : null,
        assignedVolunteerId: vid ? (volunteerMap[vid] || listing.assignedVolunteerId) : null,
      };
    });

    return res.json({
      success: true,
      count: foodListings.length,
      foodListings
    });
  } catch (error) {
    console.error('Get food listings error:', error);
    return res.json({
      success: true,
      count: 0,
      foodListings: []
    });
  }
});

/**
 * GET /api/food/:id
 * Get a specific food listing
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const foodListing = await FoodListing.findById(req.params.id)
      .populate('donorId', 'name email phone location')
      .populate('assignedReceiverId', 'name location capacity')
      .populate('assignedVolunteerId', 'name phone location');

    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    res.json({
      success: true,
      foodListing
    });
  } catch (error) {
    console.error('Get food listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch food listing',
      error: error.message
    });
  }
});

/**
 * PUT /api/food/:id
 * Update a food listing
 * Only the donor who created it can update
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    let user = await User.findOne({ firebaseUID: uid });
    
    // Fallback user handling
    if (!user) {
      console.log("⚠️ User not found in database, checking for fallback user in PUT route");
      
      if (req.user && req.user.email && req.user.role) {
        console.log("🔄 Using fallback user for food listing update");
        user = {
          _id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          firebaseUID: uid
        };
        console.log("✅ Using fallback user:", user.email, "Role:", user.role);
      } else {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }
    
    const foodListing = await FoodListing.findById(req.params.id);
    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    // Check if user is the donor who created it OR a receiver accepting assignment OR a volunteer managing pickup
    const isDonor = foodListing.donorId.toString() === user._id.toString();
    const isReceiver = user.role === 'receiver';
    const isVolunteer = user.role === 'volunteer';
    
    // Donors can update their own listings
    if (isDonor) {
      // Update allowed fields for donors
      const allowedUpdates = ['foodName', 'quantity', 'packagingType', 'imageUrl', 'status'];
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          foodListing[field] = req.body[field];
        }
      });

      await foodListing.save();
      await foodListing.populate('donorId', 'name email phone');

      res.json({
        success: true,
        message: 'Food listing updated successfully',
        foodListing
      });
    } 
    // Receivers can accept assignments (only update assignedReceiverId and status)
    else if (isReceiver && req.body.assignedReceiverId && req.body.status === 'assigned') {
      foodListing.assignedReceiverId = user._id;
      foodListing.status = 'assigned';
      await foodListing.save();
      
      res.json({
        success: true,
        message: 'Food assignment accepted successfully',
        foodListing
      });
    }
    // Receivers can mark assigned food as picked up
    else if (isReceiver && req.body.status === 'picked_up' && foodListing.assignedReceiverId && foodListing.assignedReceiverId.toString() === user._id.toString()) {
      foodListing.status = 'picked_up';
      await foodListing.save();
      
      res.json({
        success: true,
        message: 'Food marked as picked up successfully',
        foodListing
      });
    }
    // Volunteers can accept pickup requests
    else if (isVolunteer && req.body.status === 'assigned_to_volunteer' && foodListing.status === 'assigned') {
      foodListing.assignedVolunteerId = user._id;
      foodListing.status = 'assigned_to_volunteer';
      await foodListing.save();
      
      res.json({
        success: true,
        message: 'Pickup assignment accepted successfully',
        foodListing
      });
    }
    // Volunteers can mark assigned pickups as picked up from donor
    else if (isVolunteer && req.body.status === 'picked_up' && foodListing.assignedVolunteerId && foodListing.assignedVolunteerId.toString() === user._id.toString()) {
      foodListing.status = 'picked_up';
      await foodListing.save();
      
      res.json({
        success: true,
        message: 'Food marked as picked up from donor successfully',
        foodListing
      });
    }
    // Volunteers can mark picked up items as delivered to receiver
    else if (isVolunteer && req.body.status === 'delivered' && foodListing.assignedVolunteerId && foodListing.assignedVolunteerId.toString() === user._id.toString()) {
      foodListing.status = 'delivered';
      await foodListing.save();
      
      res.json({
        success: true,
        message: 'Food delivered to receiver successfully',
        foodListing
      });
    }
    // Unauthorized access
    else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this listing'
      });
    }
  } catch (error) {
    console.error('Update food listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update food listing',
      error: error.message
    });
  }
});

/**
 * DELETE /api/food/:id
 * Delete a food listing
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await User.findOne({ firebaseUID: uid });
    
    const foodListing = await FoodListing.findById(req.params.id);
    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    // Check if user is the donor or admin
    if (foodListing.donorId.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing'
      });
    }

    await foodListing.deleteOne();

    res.json({
      success: true,
      message: 'Food listing deleted successfully'
    });
  } catch (error) {
    console.error('Delete food listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete food listing',
      error: error.message
    });
  }
});

/**
 * GET /api/food/:id/matched-receivers
 * Get smart matched receivers for a specific food listing
 */
router.get('/:id/matched-receivers', authenticate, async (req, res) => {
  try {
    const foodListing = await FoodListing.findById(req.params.id);
    
    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    // Check if user is the donor or admin
    if (foodListing.donorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view matched receivers for this listing'
      });
    }

    // Get matched receivers using smart matching
    const matchedReceivers = await findBestReceivers(foodListing);

    res.json({
      success: true,
      foodListing: {
        id: foodListing._id,
        foodName: foodListing.foodName,
        quantity: foodListing.quantity,
        urgency: foodListing.urgency,
        location: foodListing.location
      },
      matchedReceivers,
      totalReceivers: matchedReceivers.length
    });
  } catch (error) {
    console.error('Get matched receivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get matched receivers',
      error: error.message
    });
  }
});

/**
 * GET /api/food/match/:foodId/:receiverId
 * Auto-assign a receiver to a food listing (system auto-selection)
 */
router.post('/match/:foodId/:receiverId', authenticate, async (req, res) => {
  try {
    const { foodId, receiverId } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can auto-assign receivers'
      });
    }

    const foodListing = await FoodListing.findById(foodId);
    const receiver = await User.findById(receiverId);

    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    if (!receiver || receiver.role !== 'receiver') {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Get matching score for this specific receiver
    const matchedReceivers = await findBestReceivers(foodListing);
    const selectedReceiver = matchedReceivers.find(r => r._id.toString() === receiverId);

    if (!selectedReceiver) {
      return res.status(400).json({
        success: false,
        message: 'This receiver is not in the top matched receivers'
      });
    }

    // Update food listing with assigned receiver
    foodListing.assignedReceiverId = receiverId;
    foodListing.status = 'assigned';
    foodListing.matchingStatus = 'completed'; // 🎯 UPGRADE 9: Status locking
    await foodListing.save();

    // 🎯 UPGRADE 6: Real-time capacity updates
    // Decrease receiver's remaining capacity immediately
    await User.findByIdAndUpdate(receiverId, {
      $inc: { 
        currentLoad: foodListing.quantity,
        recentAssignments: 1 
      }
    });

    // 🎯 UPGRADE 10: Store matching history
    const matchingHistory = {
      foodListingId: foodListing._id,
      receiverId: receiverId,
      matchingScore: selectedReceiver.matchingScore,
      distance: selectedReceiver.distance,
      remainingCapacity: selectedReceiver.remainingCapacity,
      assignedAt: new Date(),
      allTopMatches: matchedReceivers.map(r => ({
        receiverId: r._id,
        score: r.matchingScore,
        distance: r.distance
      }))
    };

    // Store in food listing for analytics
    foodListing.matchingHistory = matchingHistory;
    await foodListing.save();

    res.json({
      success: true,
      message: 'Receiver auto-assigned successfully',
      foodListing,
      assignedReceiver: selectedReceiver,
      matchingScore: selectedReceiver.matchingScore
    });
  } catch (error) {
    console.error('Auto-assign receiver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign receiver',
      error: error.message
    });
  }
});

/**
 * POST /api/food/reject/:foodId/:receiverId
 * Handle receiver rejection and auto-assign next best receiver
 */
router.post('/reject/:foodId/:receiverId', authenticate, async (req, res) => {
  try {
    const { foodId, receiverId } = req.params;

    const foodListing = await FoodListing.findById(foodId);
    if (!foodListing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    // Check if user is the assigned receiver or admin
    if (req.user._id.toString() !== receiverId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this assignment'
      });
    }

    // 🎯 UPGRADE 7: Rejection handling with auto-fallback
    console.log(`🚫 Receiver ${receiverId} rejected food listing ${foodId}`);

    // Get fresh matches (excluding the rejecting receiver)
    const freshMatches = await findBestReceivers(foodListing);
    const availableReceivers = freshMatches.filter(r => r._id.toString() !== receiverId);

    if (availableReceivers.length > 0) {
      // Auto-assign next best receiver
      const nextBestReceiver = availableReceivers[0];
      
      // Update food listing
      foodListing.assignedReceiverId = nextBestReceiver._id;
      foodListing.status = 'assigned';
      foodListing.rejectionHistory = foodListing.rejectionHistory || [];
      foodListing.rejectionHistory.push({
        receiverId: receiverId,
        rejectedAt: new Date(),
        reason: 'Receiver declined assignment'
      });
      await foodListing.save();

      // Update new receiver's capacity
      await User.findByIdAndUpdate(nextBestReceiver._id, {
        $inc: { 
          currentLoad: foodListing.quantity,
          recentAssignments: 1 
        }
      });

      console.log(`🔄 Auto-assigned next best receiver: ${nextBestReceiver.name}`);

      res.json({
        success: true,
        message: 'Assignment rejected and auto-assigned to next best receiver',
        rejectedReceiverId: receiverId,
        newAssignedReceiver: nextBestReceiver,
        matchingScore: nextBestReceiver.matchingScore
      });
    } else {
      // No other receivers available
      foodListing.status = 'available';
      foodListing.assignedReceiverId = null;
      foodListing.rejectionHistory = foodListing.rejectionHistory || [];
      foodListing.rejectionHistory.push({
        receiverId: receiverId,
        rejectedAt: new Date(),
        reason: 'Receiver declined assignment - no fallback available'
      });
      await foodListing.save();

      res.json({
        success: true,
        message: 'Assignment rejected, no other receivers available',
        foodListingStatus: 'available'
      });
    }
  } catch (error) {
    console.error('Reject assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process rejection',
      error: error.message
    });
  }
});

/**
 * POST /api/food/reset-capacity/:receiverId
 * Reset receiver capacity (for testing/admin use)
 */
router.post('/reset-capacity/:receiverId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reset capacity'
      });
    }

    await User.findByIdAndUpdate(req.params.receiverId, {
      $set: { 
        currentLoad: 0,
        recentAssignments: 0 
      }
    });

    res.json({
      success: true,
      message: 'Receiver capacity reset successfully'
    });
  } catch (error) {
    console.error('Reset capacity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset capacity',
      error: error.message
    });
  }
});

module.exports = router;
