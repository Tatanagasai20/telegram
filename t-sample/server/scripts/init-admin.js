/**
 * Script to initialize the database with a default admin user
 * Run with: node scripts/init-admin.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Default admin user data
const adminData = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'admin123',  // This should be changed after first login
  role: 'admin'
};

// Create admin user if it doesn't exist
async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create new admin user
    const admin = new User(adminData);
    await admin.save();
    
    console.log('Admin user created successfully');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('IMPORTANT: Please change this password after first login!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}

createAdminUser();