const User = require("../models/User");
const DailyChallenge = require("../models/dailyChallenge");

const completeChallenge = async (req, res) => {
  try {
    const userId = req.user.id; // assuming you use auth middleware
    const { challengeId, score } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const challenge = await DailyChallenge.findById(challengeId);
    if (!challenge)
      return res.status(404).json({ message: "Challenge not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      // ✅ First ever completion
      user.streak = 1;
    } else if (lastDate.getTime() === today.getTime()) {
      // ✅ Already played today → streak unchanged
    } else if (
      lastDate.getTime() === new Date(today.getTime() - 86400000).getTime()
    ) {
      // ✅ Played yesterday → increment streak
      user.streak += 1;
    } else {
      // ❌ Missed a day → reset streak
      user.streak = 1;
    }

    user.lastQuizDate = new Date();

    // Add some reward
    user.totalScore += score;
    user.experience += score * 10;

    await user.save();

    res.json({
      message: "Challenge completed",
      streak: user.streak,
      totalScore: user.totalScore,
      experience: user.experience,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to complete challenge", error: err.message });
  }
};

module.exports = completeChallenge;
