const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/coursehub";
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected:", uri);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Make sure MongoDB is running locally, or set MONGODB_URI in .env to your MongoDB Atlas connection string.");
    process.exit(1);
  }
}

module.exports = connectDB;
