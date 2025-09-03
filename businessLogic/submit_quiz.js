const mongoose = require("mongoose");
const User = require("../models/User");
const Quiz = require("../models/quiz");
const {
  DailyChallenge,
  ChallengeAttempt,
} = require("../models/dailyChallenge");

const submitQuiz = async (req, res) => {
  try {
    const { id, answers, type } = req.body; // id = quizId or dailyChallengeId
    const userId = req.params.id;

    let questions = [];
    let title = "";

    if (type === "quiz") {
      const quiz = await Quiz.findById(id);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      questions = quiz.questions;
      title = quiz.title;
    } else if (type === "challenge") {
      const dailyChallenge = await DailyChallenge.findById(id);
      if (!dailyChallenge)
        return res.status(404).json({ message: "Daily challenge not found" });

      // Check if user already attempted
      const existingAttempt = await ChallengeAttempt.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        challengeId: new mongoose.Types.ObjectId(id),
      });
      if (existingAttempt) {
        return res
          .status(400)
          .json({ message: "You have already attempted this challenge" });
      }

      questions = dailyChallenge.questions;
      title = dailyChallenge.title;
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    // Calculate score
    let score = 0;
    questions.forEach((q, idx) => {
      if (parseInt(answers[idx]) === parseInt(q.correctAnswer)) score++;
    });

    // Base reward (2 coins per correct answer)
    let reward = score * 2;

    // Update user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins += reward;
    user.totalScore += reward;

    // 🔥 Hybrid streak system
    const today = new Date();
    const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;

    if (lastActivity) {
      const diffInDays = Math.floor(
        (today - lastActivity) / (1000 * 60 * 60 * 24)
      );
      if (diffInDays === 1) user.streak += 1; // continued streak
      else if (diffInDays > 1) user.streak = 1; // reset streak
    } else {
      user.streak = 1; // first streak
    }
    user.lastActivity = today;

    // 🎁 Bonuses
    let streakBonus = 0;
    let milestoneBonus = 0;

    if (score > 0) {
      streakBonus = 5;
      user.coins += streakBonus;
    }

    if (user.streak % 7 === 0) {
      milestoneBonus = 20;
      user.coins += milestoneBonus;
    }

    user.totalReward = reward + streakBonus + milestoneBonus;

    // Save user
    await user.save();

    // Save challenge attempt if type is challenge
    // if (type === "challenge") {
    //   const attempt = new ChallengeAttempt({
    //     userId: mongoose.Types.ObjectId(userId),
    //     challengeId: mongoose.Types.ObjectId(id),
    //     score,
    //   });
    //   await attempt.save();
    // }

    res.json({
      message: `${type} submitted successfully`,
      title,
      score,
      reward,
      streakBonus,
      milestoneBonus,
      totalReward: user.totalReward,
      coins: user.coins,
      streak: user.streak,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = submitQuiz;
