const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const FoodListing = require('../models/FoodListing');
const Delivery = require('../models/Delivery');

dotenv.config();

/**
 * Run with:
 * node scripts/seedData.js
 */

const sampleUsers = [
  // Donors
  {
    firebaseUID: 'donor-1',
    email: 'restaurant1@example.com',
    name: 'Green Garden Restaurant',
    role: 'donor',
    phone: '+1234567890',
    location: { latitude: 40.7128, longitude: -74.0060 }
  },
  {
    firebaseUID: 'donor-2',
    email: 'cafe2@example.com',
    name: 'Sunrise Cafe',
    role: 'donor',
    phone: '+1234567891',
    location: { latitude: 40.730610, longitude: -73.935242 }
  },
  {
    firebaseUID: 'donor-3',
    email: 'bakery3@example.com',
    name: 'Sweet Dreams Bakery',
    role: 'donor',
    phone: '+1234567892',
    location: { latitude: 40.7489, longitude: -73.9870 }
  },

  // Receivers
  {
    firebaseUID: 'receiver-1',
    email: 'shelter1@example.com',
    name: 'Hope Community Shelter',
    role: 'receiver',
    phone: '+1234567893',
    location: { latitude: 40.7130, longitude: -74.0090 },
    capacity: 50,
    isOpen: true
  },
  {
    firebaseUID: 'receiver-2',
    email: 'foodbank2@example.com',
    name: 'City Food Bank',
    role: 'receiver',
    phone: '+1234567894',
    location: { latitude: 40.732610, longitude: -73.933242 },
    capacity: 100,
    isOpen: true
  },
  {
    firebaseUID: 'receiver-3',
    email: 'kitchen3@example.com',
    name: 'Community Kitchen',
    role: 'receiver',
    phone: '+1234567895',
    location: { latitude: 40.7499, longitude: -73.9850 },
    capacity: 30,
    isOpen: true
  },

  // Volunteers
  {
    firebaseUID: 'volunteer-1',
    email: 'volunteer1@example.com',
    name: 'John Helper',
    role: 'volunteer',
    phone: '+1234567896',
    location: { latitude: 40.7118, longitude: -74.0050 },
    isAvailable: true
  },
  {
    firebaseUID: 'volunteer-2',
    email: 'volunteer2@example.com',
    name: 'Sarah Driver',
    role: 'volunteer',
    phone: '+1234567897',
    location: { latitude: 40.731610, longitude: -73.936242 },
    isAvailable: true
  },
  {
    firebaseUID: 'volunteer-3',
    email: 'volunteer3@example.com',
    name: 'Mike Transport',
    role: 'volunteer',
    phone: '+1234567898',
    location: { latitude: 40.7479, longitude: -73.9880 },
    isAvailable: false
  },

  // Admin
  {
    firebaseUID: 'admin-1',
    email: 'admin@foodroute.com',
    name: 'System Administrator',
    role: 'admin',
    phone: '+1234567899',
    location: { latitude: 40.7128, longitude: -74.0060 }
  }
];

const sampleFoodListings = [
  {
    foodName: 'Fresh Vegetable Platters',
    quantity: 25,
    timeCooked: new Date(Date.now() - 2 * 60 * 60 * 1000),
    location: { latitude: 40.7128, longitude: -74.0060, address: '123 Main St, NYC' },
    packagingType: 'container',
    urgency: 'medium',
    status: 'available'
  },
  {
    foodName: 'Assorted Sandwiches',
    quantity: 40,
    timeCooked: new Date(Date.now() - 60 * 60 * 1000),
    location: { latitude: 40.730610, longitude: -73.935242, address: 'Brooklyn Ave' },
    packagingType: 'box',
    urgency: 'high',
    status: 'available'
  },
  {
    foodName: 'Fresh Bread Loaves',
    quantity: 15,
    timeCooked: new Date(Date.now() - 30 * 60 * 1000),
    location: { latitude: 40.7489, longitude: -73.9870, address: 'Manhattan St' },
    packagingType: 'bag',
    urgency: 'low',
    status: 'available'
  }
];

const sampleDeliveries = [
  { status: 'delivered' },
  { status: 'in_transit' },
  { status: 'pending' }
];

const seedData = async () => {
  try {
    console.log('🌱 Starting seeding...');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany({});
    await FoodListing.deleteMany({});
    await Delivery.deleteMany({});
    console.log('🧹 Cleared existing data');

    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    const donors = createdUsers.filter(u => u.role === 'donor');
    const receivers = createdUsers.filter(u => u.role === 'receiver');
    const volunteers = createdUsers.filter(u => u.role === 'volunteer');

    const foodListings = sampleFoodListings.map((listing, i) => ({
      ...listing,
      donorId: donors[i % donors.length]._id
    }));

    const createdFoodListings = await FoodListing.insertMany(foodListings);
    console.log(`✅ Created ${createdFoodListings.length} food listings`);

    const deliveries = sampleDeliveries.map((delivery, i) => {
  const foodListing = createdFoodListings[i];
  const donorId = foodListing.donorId;

  return {
    ...delivery,
    foodListingId: foodListing._id,
    donorId: donorId,   // 🔥 THIS WAS MISSING
    receiverId: receivers[i % receivers.length]._id,
    volunteerId: delivery.status !== 'pending'
      ? volunteers[i % volunteers.length]._id
      : null
  };
});

    const createdDeliveries = await Delivery.insertMany(deliveries);
    console.log(`✅ Created ${createdDeliveries.length} deliveries`);

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

if (require.main === module) {
  seedData();
}

module.exports = { seedData };