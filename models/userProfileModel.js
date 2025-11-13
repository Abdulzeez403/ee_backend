const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["quiz", "exam", "achievement", "coin", "streak"],
    required: true,
  },
  description: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed }, // Flexible details e.g. { subject: "Math", score: 85 }
  createdAt: { type: Date, default: Date.now },
});

// 🎯 Tracks per-subject performance
const subjectProgressSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  name: String,
  quizzesCompleted: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
});

// 🏆 Tracks achievements/badges earned
const achievementSchema = new mongoose.Schema({
  key: { type: String, required: true }, // e.g. "first_quiz", "perfect_score"
  title: String,
  description: String,
  icon: String,
  earnedAt: { type: Date, default: Date.now },
});

// 📊 General performance and gamification stats
const statsSchema = new mongoose.Schema({
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  quizzesCompleted: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
});

// 🧠 Overall User Profile
const userProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    fullName: String,
    email: String,
    avatar: String,
    joinDate: { type: Date, default: Date.now },

    stats: statsSchema,
    subjects: [subjectProgressSchema],
    achievements: [achievementSchema],
    activityLog: [activitySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
