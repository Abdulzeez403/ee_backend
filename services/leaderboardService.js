const User = require("../models/User")
const Leaderboard = require("../models/Leaderboard")
const Quiz = require("../models/Quiz")

class LeaderboardService {
  // Get global leaderboard
  async getGlobalLeaderboard({ page, limit }) {
    const leaderboard = await User.find({ status: "active" })
      .select("username email totalExperience totalCoins level streak")
      .sort({ totalExperience: -1, totalCoins: -1 })
      .limit(limit)
      .skip((page - 1) * limit)

    const total = await User.countDocuments({ status: "active" })

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user.toObject(),
      rank: (page - 1) * limit + index + 1,
    }))

    return {
      leaderboard: rankedLeaderboard,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  // Get subject-specific leaderboard
  async getSubjectLeaderboard(subject, { page, limit }) {
    const pipeline = [
      { $match: { status: "completed" } },
      { $unwind: "$questions" },
      {
        $lookup: {
          from: "questions",
          localField: "questions",
          foreignField: "_id",
          as: "questionData",
        },
      },
      { $unwind: "$questionData" },
      { $match: { "questionData.subject": subject } },
      {
        $group: {
          _id: "$user",
          averageScore: { $avg: "$score" },
          totalQuizzes: { $sum: 1 },
          totalExperience: { $sum: "$experienceGained" },
        },
      },
      { $sort: { averageScore: -1, totalExperience: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: "$userData" },
      {
        $project: {
          username: "$userData.username",
          email: "$userData.email",
          averageScore: 1,
          totalQuizzes: 1,
          totalExperience: 1,
          level: "$userData.level",
        },
      },
    ]

    const leaderboard = await Quiz.aggregate(pipeline)

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: (page - 1) * limit + index + 1,
    }))

    // Get total count for pagination
    const countPipeline = pipeline.slice(0, -3) // Remove skip, limit, and lookup
    countPipeline.push({ $count: "total" })
    const totalResult = await Quiz.aggregate(countPipeline)
    const total = totalResult[0]?.total || 0

    return {
      leaderboard: rankedLeaderboard,
      subject,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  // Get weekly leaderboard
  async getWeeklyLeaderboard({ page, limit }) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const pipeline = [
      {
        $match: {
          status: "completed",
          createdAt: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: "$user",
          weeklyExperience: { $sum: "$experienceGained" },
          weeklyQuizzes: { $sum: 1 },
          averageScore: { $avg: "$score" },
        },
      },
      { $sort: { weeklyExperience: -1, averageScore: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: "$userData" },
      {
        $project: {
          username: "$userData.username",
          email: "$userData.email",
          weeklyExperience: 1,
          weeklyQuizzes: 1,
          averageScore: 1,
          level: "$userData.level",
          totalExperience: "$userData.totalExperience",
        },
      },
    ]

    const leaderboard = await Quiz.aggregate(pipeline)

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: (page - 1) * limit + index + 1,
    }))

    // Get total count
    const countPipeline = pipeline.slice(0, -4)
    countPipeline.push({ $count: "total" })
    const totalResult = await Quiz.aggregate(countPipeline)
    const total = totalResult[0]?.total || 0

    return {
      leaderboard: rankedLeaderboard,
      period: "weekly",
      periodStart: weekStart,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  // Get monthly leaderboard
  async getMonthlyLeaderboard({ page, limit }) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const pipeline = [
      {
        $match: {
          status: "completed",
          createdAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: "$user",
          monthlyExperience: { $sum: "$experienceGained" },
          monthlyQuizzes: { $sum: 1 },
          averageScore: { $avg: "$score" },
        },
      },
      { $sort: { monthlyExperience: -1, averageScore: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: "$userData" },
      {
        $project: {
          username: "$userData.username",
          email: "$userData.email",
          monthlyExperience: 1,
          monthlyQuizzes: 1,
          averageScore: 1,
          level: "$userData.level",
          totalExperience: "$userData.totalExperience",
        },
      },
    ]

    const leaderboard = await Quiz.aggregate(pipeline)

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: (page - 1) * limit + index + 1,
    }))

    // Get total count
    const countPipeline = pipeline.slice(0, -4)
    countPipeline.push({ $count: "total" })
    const totalResult = await Quiz.aggregate(countPipeline)
    const total = totalResult[0]?.total || 0

    return {
      leaderboard: rankedLeaderboard,
      period: "monthly",
      periodStart: monthStart,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  // Get user's position in leaderboard
  async getUserPosition(userId, type = "global") {
    let position = null

    switch (type) {
      case "global":
        const globalRank = await User.countDocuments({
          status: "active",
          $or: [
            {
              totalExperience: {
                $gt: await User.findById(userId)
                  .select("totalExperience")
                  .then((u) => u?.totalExperience || 0),
              },
            },
            {
              totalExperience: await User.findById(userId)
                .select("totalExperience")
                .then((u) => u?.totalExperience || 0),
              totalCoins: {
                $gt: await User.findById(userId)
                  .select("totalCoins")
                  .then((u) => u?.totalCoins || 0),
              },
            },
          ],
        })
        position = { rank: globalRank + 1, type: "global" }
        break

      case "weekly":
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)

        const userWeeklyExp = await Quiz.aggregate([
          {
            $match: {
              user: userId,
              status: "completed",
              createdAt: { $gte: weekStart },
            },
          },
          { $group: { _id: null, total: { $sum: "$experienceGained" } } },
        ])

        const weeklyRank = await Quiz.aggregate([
          {
            $match: {
              status: "completed",
              createdAt: { $gte: weekStart },
            },
          },
          {
            $group: {
              _id: "$user",
              weeklyExperience: { $sum: "$experienceGained" },
            },
          },
          {
            $match: {
              weeklyExperience: { $gt: userWeeklyExp[0]?.total || 0 },
            },
          },
          { $count: "rank" },
        ])

        position = {
          rank: (weeklyRank[0]?.rank || 0) + 1,
          type: "weekly",
          experience: userWeeklyExp[0]?.total || 0,
        }
        break

      case "monthly":
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const userMonthlyExp = await Quiz.aggregate([
          {
            $match: {
              user: userId,
              status: "completed",
              createdAt: { $gte: monthStart },
            },
          },
          { $group: { _id: null, total: { $sum: "$experienceGained" } } },
        ])

        const monthlyRank = await Quiz.aggregate([
          {
            $match: {
              status: "completed",
              createdAt: { $gte: monthStart },
            },
          },
          {
            $group: {
              _id: "$user",
              monthlyExperience: { $sum: "$experienceGained" },
            },
          },
          {
            $match: {
              monthlyExperience: { $gt: userMonthlyExp[0]?.total || 0 },
            },
          },
          { $count: "rank" },
        ])

        position = {
          rank: (monthlyRank[0]?.rank || 0) + 1,
          type: "monthly",
          experience: userMonthlyExp[0]?.total || 0,
        }
        break
    }

    return position
  }

  // Get leaderboard around user
  async getLeaderboardAroundUser(userId, { range, type }) {
    const userPosition = await this.getUserPosition(userId, type)
    if (!userPosition) return { leaderboard: [], userPosition: null }

    const startRank = Math.max(1, userPosition.rank - range)
    const page = Math.ceil(startRank / (range * 2 + 1))
    const limit = range * 2 + 1

    let leaderboard
    switch (type) {
      case "weekly":
        leaderboard = await this.getWeeklyLeaderboard({ page, limit })
        break
      case "monthly":
        leaderboard = await this.getMonthlyLeaderboard({ page, limit })
        break
      default:
        leaderboard = await this.getGlobalLeaderboard({ page, limit })
    }

    return {
      leaderboard: leaderboard.leaderboard,
      userPosition,
      range,
    }
  }

  // Update leaderboard (called after quiz completion)
  async updateLeaderboard(userId, quizData) {
    try {
      // Update or create leaderboard entry
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await Leaderboard.findOneAndUpdate(
        { user: userId, date: today },
        {
          $inc: {
            experienceGained: quizData.experienceGained,
            quizzesCompleted: 1,
            totalScore: quizData.score,
          },
          $set: {
            lastUpdated: new Date(),
          },
        },
        { upsert: true, new: true },
      )

      return true
    } catch (error) {
      console.error("Update leaderboard error:", error)
      return false
    }
  }
}

module.exports = new LeaderboardService()
