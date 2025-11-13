const mongoose = require("mongoose");
const User = require("../models/userModel"); // adjust path
require("dotenv").config();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const existingAdmin = await User.findOne({ email: "passrite@gmail.com" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit(0);
    }

    const admin = new User({
      username: "admin",
      email: "passrite@gmail.com",
      password: "123456", // 🔒 use a secure password
      firstName: "Passrite",
      lastName: "Admin",
      role: "admin",
    });

    await admin.save();
    console.log("🎉 Admin user created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding admin:", err.message);
    process.exit(1);
  }
}

seedAdmin();
