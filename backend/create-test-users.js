const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodroute')
  .then(async () => {
    console.log('🔍 Creating test users...');
    
    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️ Cleared existing users');
    
    // Create test users
    const testUsers = [
      {
        email: 'donorId1@test.com',
        name: 'Test Donor',
        role: 'donor',
        firebaseUID: 'donor-uid',
        phone: '9111111111',
        location: {
          latitude: 26.2062,
          longitude: 78.2036,
          address: 'Govindpuri, Gwalior'
        },
        capacity: 50,
        isOpen: true,
        isAvailable: true
      },
      {
        email: 'receiver@test.com',
        name: 'Test Receiver',
        role: 'receiver',
        firebaseUID: 'receiver-uid',
        phone: '9222222222',
        location: {
          latitude: 26.2062,
          longitude: 78.2036,
          address: 'Govindpuri, Gwalior'
        },
        capacity: 30,
        isOpen: true,
        isAvailable: true
      },
      {
        email: 'volunteer@test.com',
        name: 'Test Volunteer',
        role: 'volunteer',
        firebaseUID: 'volunteer-uid',
        phone: '9333333333',
        location: {
          latitude: 26.2062,
          longitude: 78.2036,
          address: 'Govindpuri, Gwalior'
        },
        capacity: 100,
        isOpen: true,
        isAvailable: true
      },
      {
        email: 'rj1@gmail.com',
        name: 'Rj1 User',
        role: 'donor',
        firebaseUID: 'rj1-uid',
        phone: '9444444444',
        location: {
          latitude: 26.2062,
          longitude: 78.2036,
          address: 'Govindpuri, Gwalior'
        },
        capacity: 25,
        isOpen: true,
        isAvailable: true
      }
    ];
    
    // Insert test users
    await User.insertMany(testUsers);
    console.log('✅ Created test users:');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role})`);
    });
    
    console.log('\n🎯 Test Accounts Ready:');
    console.log('Donor: donorId1@test.com');
    console.log('Receiver: receiver@test.com');
    console.log('Volunteer: volunteer@test.com');
    console.log('Rj1: rj1@gmail.com');
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database error:', error);
    process.exit(1);
  });
