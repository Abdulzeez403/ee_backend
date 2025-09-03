const User = require("../models/User")
const Quiz = require("../models/Quiz")
const Transaction = require("../models/Transaction")
const CoinService = require("./coinService")

class AchievementService {
  // Check and award achievements after quiz completion
  static async checkQuizAchievements(userId, quiz) {
    try {
      const achievements = []
      const user = await User.findById(userId)

      // Perfect Score Achievement
      if (quiz.percentage === 100) {
        const achievement = await this.awardAchievement(userId, "perfect_score", {
          quizId: quiz._id,
          subject: quiz.subject,
        })
        if (achievement) achievements.push(achievement)
      }

      // Speed Demon Achievement (high score in short time)
      const avgTimePerQuestion = quiz.totalTimeSpent / quiz.totalQuestions
      if (avgTimePerQuestion < 30 && quiz.percentage >= 80) {
        const achievement = await this.awardAchievement(userId, "speed_demon", {
          quizId: quiz._id,
          avgTime: avgTimePerQuestion,
        })
        if (achievement) achievements.push(achievement)
      }

      // Subject Master Achievement (10 perfect scores in same subject)
      const perfectScoresInSubject = await Quiz.countDocuments({
        user: userId,
        subject: quiz.subject,
        percentage: 100,
        status: "completed",
      })

      if (perfectScoresInSubject >= 10) {
        const achievement = await this.awardAchievement(userId, "subject_master", {
          subject: quiz.subject,
          perfectScores: perfectScoresInSubject,
        })
        if (achievement) achievements.push(achievement)
      }

      // Quiz Marathon Achievement (50 completed quizzes)
      const totalQuizzes = await Quiz.countDocuments({
        user: userId,
        status: "completed",
      })

      if (totalQuizzes >= 50) {
        const achievement = await this.awardAchievement(userId, "quiz_marathon", {
          totalQuizzes,
        })
        if (achievement) achievements.push(achievement)
      }

      // Streak achievements
      if (user.streak >= 7) {
        const achievement = await this.awardAchievement(userId, "week_warrior", {
          streak: user.streak,
        })
        if (achievement) achievements.push(achievement)
      }

      if (user.streak >= 30) {
        const achievement = await this.awardAchievement(userId, "month_master", {
          streak: user.streak,
        })
        if (achievement) achievements.push(achievement)
      }

      return achievements
    } catch (error) {
      console.error("Check quiz achievements error:", error)
      return []
    }
  }

  // Award achievement to user
  static async awardAchievement(userId, achievementType, metadata = {}) {
    try {
      const user = await User.findById(userId)
      const achievementConfig = this.getAchievementConfig(achievementType)

      if (!achievementConfig) {
        throw new Error("Unknown achievement type")
      }

      // Check if user already has this achievement
      const existingAchievement = user.achievements.find((a) => a.name === achievementConfig.name)

      if (existingAchievement) {
        return null // Already has this achievement
      }

      // Add achievement to user
      const achievement = {
        name: achievementConfig.name,
        description: achievementConfig.description,
        icon: achievementConfig.icon,
        earnedAt: new Date(),
        metadata,
      }

      user.achievements.push(achievement)
      await user.save()

      // Award coins for achievement
      if (achievementConfig.coinReward > 0) {
        await CoinService.awardCoins(userId, achievementConfig.coinReward, `Achievement: ${achievementConfig.name}`, {
          achievementType,
          ...metadata,
        })
      }

      return achievement
    } catch (error) {
      console.error("Award achievement error:", error)
      return null
    }
  }

  // Get achievement configuration
  static getAchievementConfig(type) {
    const achievements = {
      perfect_score: {
        name: "Perfect Score",
        description: "Answered all questions correctly in a quiz",
        icon: "🏆",
        coinReward: 50,
      },
      speed_demon: {
        name: "Speed Demon",
        description: "Completed quiz quickly with high accuracy",
        icon: "⚡",
        coinReward: 30,
      },
      subject_master: {
        name: "Subject Master",
        description: "Achieved 10 perfect scores in the same subject",
        icon: "🎓",
        coinReward: 200,
      },
      quiz_marathon: {
        name: "Quiz Marathon",
        description: "Completed 50 quizzes",
        icon: "🏃",
        coinReward: 100,
      },
      week_warrior: {
        name: "Week Warrior",
        description: "Maintained a 7-day quiz streak",
        icon: "🔥",
        coinReward: 75,
      },
      month_master: {
        name: "Month Master",
        description: "Maintained a 30-day quiz streak",
        icon: "👑",
        coinReward: 300,
      },
      first_quiz: {
        name: "Getting Started",
        description: "Completed your first quiz",
        icon: "🌟",
        coinReward: 25,
      },
      level_up_5: {
        name: "Rising Star",
        description: "Reached level 5",
        icon: "⭐",
        coinReward: 100,
      },
      level_up_10: {
        name: "Expert",
        description: "Reached level 10",
        icon: "💎",
        coinReward: 250,
      },
      coin_collector: {
        name: "Coin Collector",
        description: "Earned 1000 coins",
        icon: "💰",
        coinReward: 100,
      },
      big_spender: {
        name: "Big Spender",
        description: "Spent 500 coins on rewards",
        icon: "💸",
        coinReward: 50,
      },
    }

    return achievements[type]
  }

  // Check level-up achievements
  static async checkLevelAchievements(userId, newLevel) {
    try {
      const achievements = []

      if (newLevel === 5) {
        const achievement = await this.awardAchievement(userId, "level_up_5", { level: newLevel })
        if (achievement) achievements.push(achievement)
      }

      if (newLevel === 10) {
        const achievement = await this.awardAchievement(userId, "level_up_10", { level: newLevel })
        if (achievement) achievements.push(achievement)
      }

      return achievements
    } catch (error) {
      console.error("Check level achievements error:", error)
      return []
    }
  }

  // Check coin-based achievements
  static async checkCoinAchievements(userId) {
    try {
      const achievements = []
      const user = await User.findById(userId)

      // Get total coins earned
      const coinStats = await Transaction.aggregate([
        {
          $match: {
            user: userId,
            coins: { $gt: 0 },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: "$coins" },
          },
        },
      ])

      const totalEarned = coinStats[0]?.totalEarned || 0

      if (totalEarned >= 1000) {
        const achievement = await this.awardAchievement(userId, "coin_collector", {
          totalEarned,
        })
        if (achievement) achievements.push(achievement)
      }

      // Get total coins spent
      const spentStats = await Transaction.aggregate([
        {
          $match: {
            user: userId,
            coins: { $lt: 0 },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: { $abs: "$coins" } },
          },
        },
      ])

      const totalSpent = spentStats[0]?.totalSpent || 0

      if (totalSpent >= 500) {
        const achievement = await this.awardAchievement(userId, "big_spender", {
          totalSpent,
        })
        if (achievement) achievements.push(achievement)
      }

      return achievements
    } catch (error) {
      console.error("Check coin achievements error:", error)
      return []
    }
  }

  // Get user's achievement progress
  static async getAchievementProgress(userId) {
    try {
      const user = await User.findById(userId)

      // Get quiz statistics
      const quizStats = await Quiz.aggregate([
        { $match: { user: userId, status: "completed" } },
        {
          $group: {
            _id: null,
            totalQuizzes: { $sum: 1 },
            perfectScores: {
              $sum: { $cond: [{ $eq: ["$percentage", 100] }, 1, 0] },
            },
            averageScore: { $avg: "$percentage" },
          },
        },
      ])

      // Get coin statistics
      const coinStats = await Transaction.aggregate([
        {
          $match: {
            user: userId,
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: { $cond: [{ $gt: ["$coins", 0] }, "$coins", 0] },
            },
            totalSpent: {
              $sum: { $cond: [{ $lt: ["$coins", 0] }, { $abs: "$coins" }, 0] },
            },
          },
        },
      ])

      const stats = quizStats[0] || { totalQuizzes: 0, perfectScores: 0, averageScore: 0 }
      const coins = coinStats[0] || { totalEarned: 0, totalSpent: 0 }

      // Calculate progress for various achievements
      const progress = {
        quiz_marathon: {
          current: stats.totalQuizzes,
          target: 50,
          percentage: Math.min((stats.totalQuizzes / 50) * 100, 100),
        },
        coin_collector: {
          current: coins.totalEarned,
          target: 1000,
          percentage: Math.min((coins.totalEarned / 1000) * 100, 100),
        },
        big_spender: {
          current: coins.totalSpent,
          target: 500,
          percentage: Math.min((coins.totalSpent / 500) * 100, 100),
        },
        level_up_5: {
          current: user.level,
          target: 5,
          percentage: Math.min((user.level / 5) * 100, 100),
        },
        level_up_10: {
          current: user.level,
          target: 10,
          percentage: Math.min((user.level / 10) * 100, 100),
        },
        week_warrior: {
          current: user.streak,
          target: 7,
          percentage: Math.min((user.streak / 7) * 100, 100),
        },
        month_master: {
          current: user.streak,
          target: 30,
          percentage: Math.min((user.streak / 30) * 100, 100),
        },
      }

      return {
        earned: user.achievements,
        progress,
        stats: {
          ...stats,
          ...coins,
          currentLevel: user.level,
          currentStreak: user.streak,
        },
      }
    } catch (error) {
      throw error
    }
  }

  // Get achievement leaderboard
  static async getAchievementLeaderboard() {
    try {
      const leaderboard = await User.aggregate([
        {
          $project: {
            username: 1,
            firstName: 1,
            lastName: 1,
            avatar: 1,
            level: 1,
            achievementCount: { $size: "$achievements" },
            achievements: 1,
          },
        },
        {
          $sort: { achievementCount: -1, level: -1 },
        },
        {
          $limit: 50,
        },
      ])

      return leaderboard
    } catch (error) {
      throw error
    }
  }
}

module.exports = AchievementService
