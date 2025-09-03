const leaderboardService = require("../services/leaderboardService")

const leaderboardController = {
  // Get global leaderboard
  async getGlobalLeaderboard(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query

      const leaderboard = await leaderboardService.getGlobalLeaderboard({
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
      })

      res.json({
        success: true,
        data: leaderboard,
      })
    } catch (error) {
      console.error("Get global leaderboard error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch global leaderboard",
      })
    }
  },

  // Get subject-specific leaderboard
  async getSubjectLeaderboard(req, res) {
    try {
      const { subject } = req.params
      const { page = 1, limit = 50 } = req.query

      const leaderboard = await leaderboardService.getSubjectLeaderboard(subject, {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
      })

      res.json({
        success: true,
        data: leaderboard,
      })
    } catch (error) {
      console.error("Get subject leaderboard error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch subject leaderboard",
      })
    }
  },

  // Get weekly leaderboard
  async getWeeklyLeaderboard(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query

      const leaderboard = await leaderboardService.getWeeklyLeaderboard({
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
      })

      res.json({
        success: true,
        data: leaderboard,
      })
    } catch (error) {
      console.error("Get weekly leaderboard error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch weekly leaderboard",
      })
    }
  },

  // Get monthly leaderboard
  async getMonthlyLeaderboard(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query

      const leaderboard = await leaderboardService.getMonthlyLeaderboard({
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
      })

      res.json({
        success: true,
        data: leaderboard,
      })
    } catch (error) {
      console.error("Get monthly leaderboard error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch monthly leaderboard",
      })
    }
  },

  // Get user's leaderboard position
  async getUserPosition(req, res) {
    try {
      const userId = req.user.id
      const { type = "global" } = req.query

      const position = await leaderboardService.getUserPosition(userId, type)

      res.json({
        success: true,
        data: position,
      })
    } catch (error) {
      console.error("Get user position error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch user position",
      })
    }
  },

  // Get leaderboard around user
  async getLeaderboardAroundUser(req, res) {
    try {
      const userId = req.user.id
      const { range = 10, type = "global" } = req.query

      const leaderboard = await leaderboardService.getLeaderboardAroundUser(userId, {
        range: Number.parseInt(range),
        type,
      })

      res.json({
        success: true,
        data: leaderboard,
      })
    } catch (error) {
      console.error("Get leaderboard around user error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch leaderboard around user",
      })
    }
  },
}

module.exports = leaderboardController
