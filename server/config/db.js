const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,        // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Fail fast if no server found
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      bufferCommands: false,  // Disable mongoose buffering
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
