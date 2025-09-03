const Reward = require("../models/Reward")
const User = require("../models/User")
const Transaction = require("../models/Transaction")
const { generatePaymentReference } = require("../utils/helpers")

class RewardController {
  // Get personalized rewards for user
  static async getPersonalizedRewards(userId) {
    try {
      const user = await User.findById(userId)

      // Get user's redemption history
      const redemptionHistory = await Transaction.find({
        user: userId,
        type: "reward_redemption",
        status: "completed",
      }).populate("reward")

      // Analyze user preferences
      const preferences = this.analyzeUserPreferences(redemptionHistory)

      // Get recommended rewards
      const recommendedRewards = await Reward.find({
        isActive: true,
        minimumLevel: { $lte: user.level },
        coinCost: { $lte: user.coins * 2 }, // Show rewards up to 2x current coins
        type: { $in: preferences.preferredTypes },
      })
        .sort({ coinCost: 1 })
        .limit(10)

      // Get affordable rewards
      const affordableRewards = await Reward.find({
        isActive: true,
        minimumLevel: { $lte: user.level },
        coinCost: { $lte: user.coins },
      })
        .sort({ coinCost: 1 })
        .limit(5)

      // Get trending rewards
      const trendingRewards = await this.getTrendingRewards()

      return {
        recommended: recommendedRewards,
        affordable: affordableRewards,
        trending: trendingRewards,
        userCoins: user.coins,
        userLevel: user.level,
      }
    } catch (error) {
      throw error
    }
  }

  // Analyze user preferences based on redemption history
  static analyzeUserPreferences(redemptionHistory) {
    const typeCount = {}
    const providerCount = {}
    const categoryCount = {}

    redemptionHistory.forEach((transaction) => {
      if (transaction.reward) {
        const reward = transaction.reward
        typeCount[reward.type] = (typeCount[reward.type] || 0) + 1
        providerCount[reward.provider] = (providerCount[reward.provider] || 0) + 1
        categoryCount[reward.category] = (categoryCount[reward.category] || 0) + 1
      }
    })

    // Get preferred types (most redeemed)
    const preferredTypes = Object.keys(typeCount)
      .sort((a, b) => typeCount[b] - typeCount[a])
      .slice(0, 3)

    // If no history, default to popular types
    if (preferredTypes.length === 0) {
      return {
        preferredTypes: ["airtime", "data", "voucher"],
        preferredProviders: ["MTN", "GLO", "AIRTEL"],
        preferredCategories: ["communication", "education"],
      }
    }

    return {
      preferredTypes,
      preferredProviders: Object.keys(providerCount).sort((a, b) => providerCount[b] - providerCount[a]),
      preferredCategories: Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a]),
    }
  }

  // Get trending rewards (most redeemed recently)
  static async getTrendingRewards() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const trending = await Transaction.aggregate([
        {
          $match: {
            type: "reward_redemption",
            status: "completed",
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: "$reward",
            redemptionCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "rewards",
            localField: "_id",
            foreignField: "_id",
            as: "reward",
          },
        },
        {
          $unwind: "$reward",
        },
        {
          $match: {
            "reward.isActive": true,
          },
        },
        {
          $sort: { redemptionCount: -1 },
        },
        {
          $limit: 5,
        },
        {
          $project: {
            reward: "$reward",
            redemptionCount: 1,
          },
        },
      ])

      return trending.map((item) => item.reward)
    } catch (error) {
      throw error
    }
  }

  // Calculate coin earning potential
  static calculateCoinEarningPotential(userLevel, subjects) {
    const baseEarning = {
      easy: 5,
      medium: 10,
      hard: 15,
    }

    // Level multiplier
    const levelMultiplier = 1 + (userLevel - 1) * 0.1

    // Subject mastery bonus
    const masteryBonus = subjects.reduce((bonus, subject) => {
      if (subject.level > 5) bonus += 0.2
      return bonus
    }, 0)

    return {
      perQuiz: {
        easy: Math.floor(baseEarning.easy * levelMultiplier * (1 + masteryBonus)),
        medium: Math.floor(baseEarning.medium * levelMultiplier * (1 + masteryBonus)),
        hard: Math.floor(baseEarning.hard * levelMultiplier * (1 + masteryBonus)),
      },
      dailyPotential: Math.floor(baseEarning.medium * levelMultiplier * (1 + masteryBonus) * 5), // 5 quizzes per day
      weeklyPotential: Math.floor(baseEarning.medium * levelMultiplier * (1 + masteryBonus) * 35), // 35 quizzes per week
    }
  }

  // Process bulk reward creation
  static async createBulkRewards(rewardsData, createdBy) {
    try {
      const results = {
        created: [],
        errors: [],
      }

      for (let i = 0; i < rewardsData.length; i++) {
        try {
          const reward = new Reward(rewardsData[i])
          await reward.save()
          results.created.push(reward)
        } catch (error) {
          results.errors.push({
            index: i,
            data: rewardsData[i],
            error: error.message,
          })
        }
      }

      return results
    } catch (error) {
      throw error
    }
  }

  // Get reward redemption analytics
  static async getRedemptionAnalytics(period = "monthly") {
    try {
      const dateFilter = this.getDateFilter(period)

      const analytics = await Transaction.aggregate([
        {
          $match: {
            type: "reward_redemption",
            createdAt: dateFilter,
          },
        },
        {
          $lookup: {
            from: "rewards",
            localField: "reward",
            foreignField: "_id",
            as: "rewardData",
          },
        },
        {
          $unwind: "$rewardData",
        },
        {
          $group: {
            _id: {
              type: "$rewardData.type",
              status: "$status",
            },
            count: { $sum: 1 },
            totalCoins: { $sum: { $abs: "$coins" } },
          },
        },
        {
          $group: {
            _id: "$_id.type",
            statuses: {
              $push: {
                status: "$_id.status",
                count: "$count",
                totalCoins: "$totalCoins",
              },
            },
            totalRedemptions: { $sum: "$count" },
            totalCoinsSpent: { $sum: "$totalCoins" },
          },
        },
        {
          $sort: { totalRedemptions: -1 },
        },
      ])

      return analytics
    } catch (error) {
      throw error
    }
  }

  // Get date filter for analytics
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
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(0) // All time
    }

    return { $gte: startDate }
  }

  // Validate reward redemption
  static async validateRedemption(userId, rewardId, additionalData = {}) {
    try {
      const user = await User.findById(userId)
      const reward = await Reward.findById(rewardId)

      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
      }

      // Check if reward exists and is active
      if (!reward || !reward.isActive) {
        validation.isValid = false
        validation.errors.push("Reward not found or inactive")
        return validation
      }

      // Check availability
      if (!reward.isAvailable()) {
        validation.isValid = false
        validation.errors.push("Reward is out of stock")
        return validation
      }

      // Check user level
      if (user.level < reward.minimumLevel) {
        validation.isValid = false
        validation.errors.push(`Requires level ${reward.minimumLevel}`)
        return validation
      }

      // Check coins
      if (user.coins < reward.coinCost) {
        validation.isValid = false
        validation.errors.push(`Insufficient coins. Need ${reward.coinCost}, have ${user.coins}`)
        return validation
      }

      // Check for required additional data
      if (["airtime", "data"].includes(reward.type) && !additionalData.phoneNumber) {
        validation.isValid = false
        validation.errors.push("Phone number is required")
        return validation
      }

      // Add warnings for high-cost items
      if (reward.coinCost > user.coins * 0.8) {
        validation.warnings.push("This will use most of your coins")
      }

      return validation
    } catch (error) {
      return {
        isValid: false,
        errors: ["Validation failed"],
      }
    }
  }
}

module.exports = RewardController
