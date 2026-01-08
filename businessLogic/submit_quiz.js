const mongoose = require("mongoose");
const User = require("../models/userModel");
const Quiz = require("../models/quizModel");
const { DailyChallenge } = require("../models/dailyChallenge");
const Attempt = require("../models/attempt");
const UserProfile = require("../models/userProfileModel");

const ensureUserProfile = async (user) => {
  let profile = await UserProfile.findOne({ userId: user._id });
  if (profile) return profile;

  profile = await UserProfile.create({
    userId: user._id,
    fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    email: user.email,
    avatar: "/default-avatar.png",
    exams: user.exams || [],
    stats: {
      level: 1,
      xp: 0,
      coins: user.coins || 0,
      quizzesCompleted: 0,
      averageScore: 0,
      currentStreak: user.streak || 0,
      longestStreak: user.streak || 0,
    },
    subjects: (user.subjects || []).map((name) => ({
      name,
      quizzesCompleted: 0,
      averageScore: 0,
      totalScore: 0,
      totalAttempts: 0,
    })),
    achievements: [],
    activityLog: [],
  });

  return profile;
};

const updateStreakForProfile = (profile, now) => {
  const last = profile.lastQuizDate ? new Date(profile.lastQuizDate) : null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let newStreak;
  if (!last) {
    newStreak = 1;
  } else {
    const lastDay = new Date(last);
    lastDay.setHours(0, 0, 0, 0);
    const diffInDays = Math.floor(
      (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffInDays === 0) newStreak = profile.stats.currentStreak || 1;
    else if (diffInDays === 1) newStreak = (profile.stats.currentStreak || 0) + 1;
    else newStreak = 1;
  }

  profile.stats.currentStreak = newStreak;
  profile.stats.longestStreak = Math.max(profile.stats.longestStreak || 0, newStreak);
  profile.lastQuizDate = now;
};

const updateSubjectProgress = (profile, subjectName, scorePercent) => {
  if (!subjectName) return;
  if (!Array.isArray(profile.subjects)) profile.subjects = [];

  const existing = profile.subjects.find((s) => s?.name === subjectName);
  if (!existing) {
    profile.subjects.push({
      name: subjectName,
      quizzesCompleted: 1,
      averageScore: scorePercent,
      totalScore: scorePercent,
      totalAttempts: 1,
    });
    return;
  }

  const prevAttempts = existing.totalAttempts || 0;
  const prevTotal = existing.totalScore || 0;
  existing.totalAttempts = prevAttempts + 1;
  existing.totalScore = prevTotal + scorePercent;
  existing.quizzesCompleted = (existing.quizzesCompleted || 0) + 1;
  existing.averageScore =
    existing.totalAttempts > 0 ? existing.totalScore / existing.totalAttempts : 0;
};

const submitQuiz = async (req, res) => {
  try {
    const { id, answers, type } = req.body;
    console.log(req.body)
    const userId = req.user.id;

    if (!["quiz", "challenge"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    // ✅ Check if user already attempted this quiz/challenge
    const existingAttempt = await Attempt.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      referenceId: new mongoose.Types.ObjectId(id),
      type,
    });

    if (existingAttempt) {
      return res
        .status(400)
        .json({ message: `You have already attempted this ${type}` });
    }

    // ✅ Fetch questions and title
    let questions = [];
    let title = "";
    let subjectName = "";
    let examName = "";

    if (type === "quiz") {
      const quiz = await Quiz.findById(id);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      questions = quiz.questions;
      title = quiz.title;
      subjectName = quiz.subject;
      examName = quiz.exam;
    } else if (type === "challenge") {
      const dailyChallenge = await DailyChallenge.findById(id);
      if (!dailyChallenge)
        return res.status(404).json({ message: "Daily challenge not found" });
      questions = dailyChallenge.questions;
      title = dailyChallenge.title;
      subjectName = dailyChallenge.subject;
      examName = dailyChallenge.exam;
    }


    // ✅ Calculate score
    let score = 0;
    questions.forEach((q, idx) => {
      if (parseInt(answers[idx]) === parseInt(q.correctAnswer)) score++;
    });

    // ✅ Base reward (2 coins per correct answer)
    const reward = score * 2;
    const totalQuestions = questions.length || 1;
    const scorePercent = Math.round((score / totalQuestions) * 100);

    // ✅ Update user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userprofile = await ensureUserProfile(user);
    if (!userprofile.stats) userprofile.stats = {};
    userprofile.stats.coins = (userprofile.stats.coins || 0) + reward;
    userprofile.stats.quizzesCompleted = (userprofile.stats.quizzesCompleted || 0) + 1;
    const prevCount = (userprofile.stats.quizzesCompleted || 1) - 1;
    const prevAvg = userprofile.stats.averageScore || 0;
    userprofile.stats.averageScore =
      (prevAvg * prevCount + scorePercent) / (prevCount + 1);
    updateSubjectProgress(userprofile, subjectName, scorePercent);

    userprofile.activityLog = Array.isArray(userprofile.activityLog)
      ? userprofile.activityLog
      : [];
    userprofile.activityLog.push({
      type: "quiz",
      description: `${type} completed`,
      meta: {
        referenceId: id,
        title,
        subject: subjectName,
        exam: examName,
        score,
        totalQuestions,
        scorePercent,
      },
    });

    const now = new Date();
    updateStreakForProfile(userprofile, now);

    // 🎁 Bonuses
    let streakBonus = 0;
    let milestoneBonus = 0;

    if (score > 0) {
      streakBonus = 5;
    }

    if ((userprofile.stats.currentStreak || 0) > 0 && userprofile.stats.currentStreak % 7 === 0) {
      milestoneBonus = 20;
    }

    const totalReward = reward + streakBonus + milestoneBonus;
    userprofile.stats.coins += streakBonus + milestoneBonus;
    userprofile.activityLog.push({
      type: "coin",
      description: "Reward earned",
      meta: { reward, streakBonus, milestoneBonus, totalReward },
    });
    userprofile.activityLog.push({
      type: "streak",
      description: "Streak updated",
      meta: {
        currentStreak: userprofile.stats.currentStreak,
        longestStreak: userprofile.stats.longestStreak,
      },
    });

    user.coins = userprofile.stats.coins;
    user.streak = userprofile.stats.currentStreak;
    user.lastQuizDate = userprofile.lastQuizDate;

    await Promise.all([userprofile.save(), user.save()]);

    // ✅ Save attempt
    const attempt = new Attempt({
      userId,
      referenceId: id,
      type,
      score,
    });
    await attempt.save();

    res.json({
      message: `${type} submitted successfully`,
      title,
      score,
      reward,
      streakBonus,
      milestoneBonus,
      totalReward,
      coins: user.coins,
      streak: user.streak,
      profile: userprofile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = submitQuiz;
