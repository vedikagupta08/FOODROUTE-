const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodroute')
  .then(async () => {
    console.log('🔍 Checking database users...');
    
    const users = await User.find({});
    console.log('📋 All users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role}, Name: ${user.name}`);
    });
    
    // Check for specific emails
    const donorUser = await User.findOne({ email: 'donorId1@test.com' });
    const receiverUser = await User.findOne({ email: 'receiver@test.com' });
    const volunteerUser = await User.findOne({ email: 'volunteer@test.com' });
    
    console.log('\n🎯 Specific user checks:');
    console.log('Donor user:', donorUser ? '✅ Found' : '❌ Not found');
    console.log('Receiver user:', receiverUser ? '✅ Found' : '❌ Not found');
    console.log('Volunteer user:', volunteerUser ? '✅ Found' : '❌ Not found');
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database error:', error);
    process.exit(1);
  });
