const User = require("../models/userModel");
const UserProfile = require("../models/userProfileModel");

// Add coins
const addCoins = async (userId, amount) => {
  const [user, profile] = await Promise.all([
    User.findById(userId),
    UserProfile.findOne({ userId }),
  ]);

  if (!user && !profile) throw new Error("User not found");

  const currentCoins = profile?.stats?.coins ?? user?.coins ?? 0;
  const nextCoins = currentCoins + Number(amount || 0);

  if (user) user.coins = nextCoins;
  if (profile) profile.stats.coins = nextCoins;

  await Promise.all([user?.save(), profile?.save()].filter(Boolean));
  return { user, profile, coins: nextCoins };
};

// Deduct coins
const deductCoins = async (userId, amount) => {
  const [user, profile] = await Promise.all([
    User.findById(userId),
    UserProfile.findOne({ userId }),
  ]);

  if (!user && !profile) throw new Error("User not found");

  const currentCoins = profile?.stats?.coins ?? user?.coins ?? 0;
  const delta = Number(amount || 0);

  if (currentCoins < delta) throw new Error("Insufficient coins");

  const nextCoins = currentCoins - delta;

  if (user) user.coins = nextCoins;
  if (profile) profile.stats.coins = nextCoins;

  await Promise.all([user?.save(), profile?.save()].filter(Boolean));
  return { user, profile, coins: nextCoins };
};

module.exports = { addCoins, deductCoins };
