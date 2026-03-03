const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../services/firebaseAuth');

/**
 * POST /api/auth/register
 * Register a new user or update existing user
 * Creates user profile in MongoDB after Firebase authentication
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const { name, role, phone, location, capacity, isOpen, isAvailable } = req.body;
    const { uid, email } = req.user;

    // Validate role
    const validRoles = ['donor', 'receiver', 'volunteer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: donor, receiver, volunteer, admin'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ firebaseUID: uid });

    if (user) {
      // Update existing user
      user.name = name || user.name;
      user.role = role || user.role;
      user.phone = phone || user.phone;
      if (location) {
        user.location = location;
      }
      if (role === 'receiver' && capacity !== undefined) {
        user.capacity = capacity;
        user.isOpen = isOpen !== undefined ? isOpen : user.isOpen;
      }
      if (role === 'volunteer' && isAvailable !== undefined) {
        user.isAvailable = isAvailable;
      }
      await user.save();

      return res.json({
        success: true,
        message: 'User updated successfully',
        user
      });
    }

    // Create new user
    const userData = {
      firebaseUID: uid,
      email,
      name,
      role,
      phone,
      location,
      capacity: role === 'receiver' ? capacity || 0 : undefined,
      isOpen: role === 'receiver' ? (isOpen !== undefined ? isOpen : true) : undefined,
      isAvailable: role === 'volunteer' ? (isAvailable !== undefined ? isAvailable : true) : undefined
    };

    user = new User(userData);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    console.log("🔍 Backend: Getting user profile for UID:", uid);
    
    const user = await User.findOne({ firebaseUID: uid });
    console.log("🔍 Backend: Found user:", user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database. Please complete registration.'
      });
    }

    console.log("🔍 Backend: User role:", user.role);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
      error: error.message
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    const updates = req.body;

    const user = await User.findOne({ firebaseUID: uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    Object.keys(updates).forEach(key => {
      if (['name', 'phone', 'location', 'capacity', 'isOpen', 'isAvailable', 'profileImage'].includes(key)) {
        user[key] = updates[key];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

module.exports = router;
