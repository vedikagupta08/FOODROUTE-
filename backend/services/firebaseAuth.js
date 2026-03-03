const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseAdmin = null;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require('../firebase-service-account.json'))
    });
    firebaseAdmin = admin;
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.log('⚠️ Firebase Admin SDK initialization failed, using mock auth for development');
  console.log('Error:', error.message);
  
  // Create mock admin for development
  firebaseAdmin = {
    auth: () => ({
      verifyIdToken: async (token) => {
        console.log('🔍 Mock auth received token:', token);
        
        // For development, extract email from the actual token
        // Firebase tokens contain email in the payload
        try {
          // Try to decode the token (simplified)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
          console.log('🔍 Decoded token payload:', payload);
          
          return { 
            uid: payload.user_id || 'temp-uid', 
            email: payload.email || 'test@example.com' 
          };
        } catch (error) {
          console.log('🔍 Token decode failed, using fallback');
          
          // Fallback: check if token contains specific emails
          if (token.includes('donorId1@test.com')) {
            return { uid: 'donor-uid', email: 'donorId1@test.com' };
          } else if (token.includes('receiver@test.com')) {
            return { uid: 'receiver-uid', email: 'receiver@test.com' };
          } else if (token.includes('volunteer@test.com')) {
            return { uid: 'volunteer-uid', email: 'volunteer@test.com' };
          } else {
            return { uid: 'temp-uid', email: 'test@example.com' };
          }
        }
      }
    })
  };
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    
    // Get user from database to include role
    const User = require('../models/User');
    let user = null;
    
    try {
      user = await User.findOne({ email: decodedToken.email });
    } catch (dbError) {
      console.log('⚠️ Database connection failed, creating fallback user');
      // Create fallback user for development
      user = null;
    }
    
    if (!user) {
      console.log('🔍 User not found in database, creating fallback user for development');
      
      // Create fallback user based on email patterns
      let fallbackRole = 'volunteer'; // default role
      let fallbackName = decodedToken.email.split('@')[0]; // name from email
      
      if (decodedToken.email.includes('donor')) {
        fallbackRole = 'donor';
        fallbackName = 'Test Donor';
      } else if (decodedToken.email.includes('receiver')) {
        fallbackRole = 'receiver';
        fallbackName = 'Test Receiver';
      } else if (decodedToken.email.includes('volunteer')) {
        fallbackRole = 'volunteer';
        fallbackName = 'Test Volunteer';
      }
      
      // Create fallback user object
      const mongoose = require('mongoose');
      user = {
        _id: new mongoose.Types.ObjectId(),
        email: decodedToken.email,
        role: fallbackRole,
        name: fallbackName,
        firebaseUID: decodedToken.uid,
        phone: '9111111111',
        location: {
          latitude: 26.2062,
          longitude: 78.2036,
          address: 'Govindpuri, Gwalior'
        },
        capacity: 50,
        isOpen: true,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('✅ Created fallback user:', user.email, 'with role:', user.role);
    }

    req.user = {
      _id: user._id,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = { authenticate };