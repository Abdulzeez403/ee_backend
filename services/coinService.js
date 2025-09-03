const User = require("../models/User")
const Transaction = require("../models/Transaction")
const Quiz = require("../models/Quiz")

class CoinService {
  // Award coins to user
  static async awardCoins(userId, amount, description, metadata = {}) {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw new Error("User not found")
      }

      // Add coins to user
      await user.addCoins(amount)

      // Create transaction record
      const transaction = new Transaction({
        user: userId,
        type: "quiz_reward",
        amount: 0,
        coins: amount,
        description,
        status: "completed",
        metadata,
      })

      await transaction.save()

      return {
        success: true,
        newBalance: user.coins,
        transaction,
      }
    } catch (error) {
      throw error
    }
  }

  // Spend coins
  static async spendCoins(userId, amount, description, metadata = {}) {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw new Error("User not found")
      }

      if (user.coins < amount) {
        throw new Error("Insufficient coins")
      }

      // Deduct coins
      await user.spendCoins(amount)

      // Create transaction record
      const transaction = new Transaction({
        user: userId,
        type: "reward_redemption",
        amount: 0,
        coins: -amount,
        description,
        status: "completed",
        metadata,
      })

      await transaction.save()

      return {
        success: true,
        newBalance: user.coins,
        transaction,
      }
    } catch (error) {
      throw error
    }
  }

  // Get user's coin balance and history
  static async getCoinBalance(userId) {
    try {
      const user = await User.findById(userId).select("coins")

      const recentTransactions = await Transaction.find({
        user: userId,
        coins: { $ne: 0 },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("type coins description createdAt status")

      const stats = await Transaction.aggregate([
        {
          $match: {
            user: userId,
            coins: { $ne: 0 },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: {
                $cond: [{ $gt: ["$coins", 0] }, "$coins", 0],
              },
            },
            totalSpent: {
              $sum: {
                $cond: [{ $lt: ["$coins", 0] }, { $abs: "$coins" }, 0],
              },
            },
            transactionCount: { $sum: 1 },
          },
        },
      ])

      return {
        currentBalance: user.coins,
        stats: stats[0] || { totalEarned: 0, totalSpent: 0, transactionCount: 0 },
        recentTransactions,
      }
    } catch (error) {
      throw error
    }
  }

  // Calculate daily coin earning potential
  static async calculateDailyPotential(userId) {
    try {
      const user = await User.findById(userId)

      // Base earning rates
      const baseRates = {
        easy: 5,
        medium: 10,
        hard: 15,
      }

      // Level multiplier (10% increase per level)
      const levelMultiplier = 1 + (user.level - 1) * 0.1

      // Calculate potential earnings
      const potential = {
        perQuiz: {
          easy: Math.floor(baseRates.easy * levelMultiplier),
          medium: Math.floor(baseRates.medium * levelMultiplier),
          hard: Math.floor(baseRates.hard * levelMultiplier),
        },
        daily: {
          conservative: Math.floor(baseRates.medium * levelMultiplier * 3), // 3 quizzes
          moderate: Math.floor(baseRates.medium * levelMultiplier * 5), // 5 quizzes
          intensive: Math.floor(baseRates.medium * levelMultiplier * 10), // 10 quizzes
        },
      }

      // Add streak bonus potential
      if (user.streak >= 3) {
        const streakBonus = user.streak * 0.2 // 20% bonus per streak day
        Object.keys(potential.perQuiz).forEach((difficulty) => {
          potential.perQuiz[difficulty] = Math.floor(potential.perQuiz[difficulty] * (1 + streakBonus))
        })
        Object.keys(potential.daily).forEach((level) => {
          potential.daily[level] = Math.floor(potential.daily[level] * (1 + streakBonus))
        })
      }

      return potential
    } catch (error) {
      throw error
    }
  }

  // Get coin leaderboard
  static async getCoinLeaderboard(period = "all-time", limit = 50) {
    try {
      const matchStage = {}

      if (period !== "all-time") {
        const dateFilter = this.getDateFilter(period)
        matchStage.createdAt = dateFilter
      }

      const leaderboard = await Transaction.aggregate([
        {
          $match: {
            ...matchStage,
            coins: { $gt: 0 },
            status: "completed",
          },
        },
        {
          $group: {
            _id: "$user",
            totalCoinsEarned: { $sum: "$coins" },
            transactionCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            username: "$user.username",
            firstName: "$user.firstName",
            lastName: "$user.lastName",
            avatar: "$user.avatar",
            level: "$user.level",
            currentCoins: "$user.coins",
            totalCoinsEarned: 1,
            transactionCount: 1,
          },
        },
        {
          $sort: { totalCoinsEarned: -1 },
        },
        {
          $limit: limit,
        },
      ])

      return leaderboard
    } catch (error) {
      throw error
    }
  }

  // Get date filter for period
  static getDateFilter(period) {
    const now = new Date()
    let startDate

    switch (period) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(0) // All time
    }

    return { $gte: startDate }
  }

  // Process bonus coins (daily login, achievements, etc.)
  static async processBonusCoins(userId, bonusType, amount = null) {
    try {
      const user = await User.findById(userId)
      let coinAmount = amount
      let description = ""

      switch (bonusType) {
        case "daily_login":
          coinAmount = coinAmount || 10
          description = "Daily login bonus"
          break
        case "first_quiz":
          coinAmount = coinAmount || 20
          description = "First quiz of the day bonus"
          break
        case "streak_bonus":
          coinAmount = coinAmount || user.streak * 5
          description = `${user.streak}-day streak bonus`
          break
        case "level_up":
          coinAmount = coinAmount || user.level * 50
          description = `Level ${user.level} achievement bonus`
          break
        case "perfect_score":
          coinAmount = coinAmount || 50
          description = "Perfect score bonus"
          break
        default:
          throw new Error("Unknown bonus type")
      }

      return await this.awardCoins(userId, coinAmount, description, { bonusType })
    } catch (error) {
      throw error
    }
  }

  // Get coin statistics for admin
  static async getCoinStatistics(period = "monthly") {
    try {
      const dateFilter = this.getDateFilter(period)

      const stats = await Transaction.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            coins: { $ne: 0 },
            status: "completed",
          },
        },
        {
          $group: {
            _id: "$type",
            totalCoins: { $sum: "$coins" },
            transactionCount: { $sum: 1 },
            avgCoinsPerTransaction: { $avg: "$coins" },
          },
        },
        {
          $sort: { totalCoins: -1 },
        },
      ])

      // Get overall statistics
      const overall = await Transaction.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            coins: { $ne: 0 },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalCoinsIssued: {
              $sum: {
                $cond: [{ $gt: ["$coins", 0] }, "$coins", 0],
              },
            },
            totalCoinsSpent: {
              $sum: {
                $cond: [{ $lt: ["$coins", 0] }, { $abs: "$coins" }, 0],
              },
            },
            totalTransactions: { $sum: 1 },
            activeUsers: { $addToSet: "$user" },
          },
        },
        {
          $project: {
            totalCoinsIssued: 1,
            totalCoinsSpent: 1,
            totalTransactions: 1,
            activeUsers: { $size: "$activeUsers" },
            netCoins: { $subtract: ["$totalCoinsIssued", "$totalCoinsSpent"] },
          },
        },
      ])

      return {
        byType: stats,
        overall: overall[0] || {
          totalCoinsIssued: 0,
          totalCoinsSpent: 0,
          totalTransactions: 0,
          activeUsers: 0,
          netCoins: 0,
        },
      }
    } catch (error) {
      throw error
    }
  }
}

module.exports = CoinService
