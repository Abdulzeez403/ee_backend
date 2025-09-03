const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Generate JWT tokens
const generateTokens = (userId, res) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "2d",
  });

  return { accessToken };
};

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

// Calculate experience needed for next level
const calculateExpForNextLevel = (currentLevel) => {
  return currentLevel * 1000;
};

// Calculate coins reward based on performance
const calculateCoinReward = (score, difficulty, streak = 0) => {
  const baseReward = {
    easy: 5,
    medium: 10,
    hard: 15,
  };

  let reward = baseReward[difficulty] || 10;

  // Performance bonus
  if (score >= 90) reward *= 1.5;
  else if (score >= 80) reward *= 1.3;
  else if (score >= 70) reward *= 1.1;

  // Streak bonus
  if (streak >= 7) reward *= 1.4;
  else if (streak >= 3) reward *= 1.2;

  return Math.floor(reward);
};

// Format time duration
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Generate payment reference
const generatePaymentReference = (prefix = "EP") => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

// Validate phone number (Nigerian format)
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/;
  return phoneRegex.test(phone);
};

// Format phone number to standard format
const formatPhoneNumber = (phone) => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");

  // Handle different formats
  if (cleaned.startsWith("234")) {
    return cleaned;
  } else if (cleaned.startsWith("0")) {
    return "234" + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    return "234" + cleaned;
  }

  return cleaned;
};

// Calculate leaderboard periods
const getLeaderboardPeriods = () => {
  const now = new Date();

  return {
    daily: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    },
    weekly: {
      start: new Date(now.setDate(now.getDate() - now.getDay())),
      end: new Date(now.setDate(now.getDate() - now.getDay() + 7)),
    },
    monthly: {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    },
  };
};

// Paginate results
const paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: Number.parseInt(limit) };
};

module.exports = {
  generateTokens,
  generateRandomString,
  calculateExpForNextLevel,
  calculateCoinReward,
  formatDuration,
  generatePaymentReference,
  validatePhoneNumber,
  formatPhoneNumber,
  getLeaderboardPeriods,
  paginate,
};
