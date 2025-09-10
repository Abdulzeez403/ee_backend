const User = require("../models/userModel");

// Add coins
const addCoins = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.coins += amount;
  await user.save();
  return user;
};

// Deduct coins
const deductCoins = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.coins < amount) throw new Error("Insufficient coins");

  user.coins -= amount;
  await user.save();
  return user;
};

module.exports = { addCoins, deductCoins };
