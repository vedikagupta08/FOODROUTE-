const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodroute')
  .then(async () => {
    console.log('🔍 Checking for user: donors@test.com');
    
    try {
      const user = await User.findOne({ email: 'donors@test.com' });
      
      if (user) {
        console.log('✅ User found:');
        console.log('- Email:', user.email);
        console.log('- Role:', user.role);
        console.log('- Firebase UID:', user.firebaseUID);
        console.log('- Name:', user.name);
      } else {
        console.log('❌ User not found: donors@test.com');
        
        // List all users
        const allUsers = await User.find({});
        console.log('\n📋 All users in database:');
        if (allUsers.length === 0) {
          console.log('No users found in database');
        } else {
          allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} (${user.role})`);
          });
        }
      }
    } catch (error) {
      console.error('❌ Database error:', error);
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  });
