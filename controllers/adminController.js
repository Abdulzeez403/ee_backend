const User = require("../models/User")
const Question = require("../models/Question")
const Quiz = require("../models/Quiz")
const Transaction = require("../models/Transaction")
const Reward = require("../models/Reward")
const { validationResult } = require("express-validator")

const adminController = {
  // Get dashboard analytics
  async getDashboardAnalytics(req, res) {
    try {
      const [
        totalUsers,
        activeUsers,
        totalQuestions,
        totalQuizzes,
        totalTransactions,
        revenueData,
        userGrowth,
        popularSubjects,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Question.countDocuments(),
        Quiz.countDocuments(),
        Transaction.countDocuments(),
        Transaction.aggregate([
          { $match: { type: "coin_purchase", status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        User.aggregate([
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": -1, "_id.month": -1 } },
          { $limit: 12 },
        ]),
        Quiz.aggregate([
          { $unwind: "$questions" },
          { $lookup: { from: "questions", localField: "questions", foreignField: "_id", as: "questionData" } },
          { $unwind: "$questionData" },
          { $group: { _id: "$questionData.subject", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ])

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            activeUsers,
            totalQuestions,
            totalQuizzes,
            totalTransactions,
            totalRevenue: revenueData[0]?.total || 0,
          },
          userGrowth,
          popularSubjects,
        },
      })
    } catch (error) {
      console.error("Get dashboard analytics error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard analytics",
      })
    }
  },

  // Get all users
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 50, search, status, role } = req.query
      const query = {}

      if (search) {
        query.$or = [{ username: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
      }

      if (status) query.status = status
      if (role) query.role = role

      const users = await User.find(query)
        .select("-password -refreshTokens")
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit))
        .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))

      const total = await User.countDocuments(query)

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total,
            pages: Math.ceil(total / Number.parseInt(limit)),
          },
        },
      })
    } catch (error) {
      console.error("Get all users error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      })
    }
  },

  // Get user details
  async getUserDetails(req, res) {
    try {
      const { userId } = req.params

      const user = await User.findById(userId).select("-password -refreshTokens")
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Get user's quiz history
      const quizHistory = await Quiz.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("questions", "subject difficulty")

      // Get user's transactions
      const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(10)

      res.json({
        success: true,
        data: {
          user,
          quizHistory,
          transactions,
        },
      })
    } catch (error) {
      console.error("Get user details error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch user details",
      })
    }
  },

  // Update user status
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params
      const { status } = req.body

      const user = await User.findByIdAndUpdate(userId, { status }, { new: true }).select("-password -refreshTokens")

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      res.json({
        success: true,
        message: "User status updated successfully",
        data: user,
      })
    } catch (error) {
      console.error("Update user status error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update user status",
      })
    }
  },

  // Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params

      const user = await User.findByIdAndDelete(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Clean up user's data
      await Promise.all([Quiz.deleteMany({ user: userId }), Transaction.deleteMany({ user: userId })])

      res.json({
        success: true,
        message: "User deleted successfully",
      })
    } catch (error) {
      console.error("Delete user error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
      })
    }
  },

  // Get all questions
  async getAllQuestions(req, res) {
    try {
      const { page = 1, limit = 50, subject, difficulty, search } = req.query
      const query = {}

      if (subject) query.subject = subject
      if (difficulty) query.difficulty = difficulty
      if (search) {
        query.question = { $regex: search, $options: "i" }
      }

      const questions = await Question.find(query)
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit))
        .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))

      const total = await Question.countDocuments(query)

      res.json({
        success: true,
        data: {
          questions,
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total,
            pages: Math.ceil(total / Number.parseInt(limit)),
          },
        },
      })
    } catch (error) {
      console.error("Get all questions error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch questions",
      })
    }
  },

  // Create question
  async createQuestion(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const question = new Question(req.body)
      await question.save()

      res.status(201).json({
        success: true,
        message: "Question created successfully",
        data: question,
      })
    } catch (error) {
      console.error("Create question error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create question",
      })
    }
  },

  // Update question
  async updateQuestion(req, res) {
    try {
      const { questionId } = req.params

      const question = await Question.findByIdAndUpdate(questionId, req.body, { new: true, runValidators: true })

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        })
      }

      res.json({
        success: true,
        message: "Question updated successfully",
        data: question,
      })
    } catch (error) {
      console.error("Update question error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update question",
      })
    }
  },

  // Delete question
  async deleteQuestion(req, res) {
    try {
      const { questionId } = req.params

      const question = await Question.findByIdAndDelete(questionId)
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        })
      }

      res.json({
        success: true,
        message: "Question deleted successfully",
      })
    } catch (error) {
      console.error("Delete question error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete question",
      })
    }
  },

  // Get all quizzes
  async getAllQuizzes(req, res) {
    try {
      const { page = 1, limit = 50, subject, status } = req.query
      const query = {}

      if (subject) query.subject = subject
      if (status) query.status = status

      const quizzes = await Quiz.find(query)
        .populate("user", "username email")
        .populate("questions", "subject difficulty")
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit))
        .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))

      const total = await Quiz.countDocuments(query)

      res.json({
        success: true,
        data: {
          quizzes,
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total,
            pages: Math.ceil(total / Number.parseInt(limit)),
          },
        },
      })
    } catch (error) {
      console.error("Get all quizzes error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch quizzes",
      })
    }
  },

  // Get quiz analytics
  async getQuizAnalytics(req, res) {
    try {
      const [totalQuizzes, completedQuizzes, averageScore, subjectPerformance, difficultyStats] = await Promise.all([
        Quiz.countDocuments(),
        Quiz.countDocuments({ status: "completed" }),
        Quiz.aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, avgScore: { $avg: "$score" } } }]),
        Quiz.aggregate([
          { $match: { status: "completed" } },
          { $unwind: "$questions" },
          { $lookup: { from: "questions", localField: "questions", foreignField: "_id", as: "questionData" } },
          { $unwind: "$questionData" },
          {
            $group: {
              _id: "$questionData.subject",
              avgScore: { $avg: "$score" },
              totalQuizzes: { $sum: 1 },
            },
          },
          { $sort: { avgScore: -1 } },
        ]),
        Quiz.aggregate([
          { $match: { status: "completed" } },
          { $unwind: "$questions" },
          { $lookup: { from: "questions", localField: "questions", foreignField: "_id", as: "questionData" } },
          { $unwind: "$questionData" },
          {
            $group: {
              _id: "$questionData.difficulty",
              avgScore: { $avg: "$score" },
              totalQuizzes: { $sum: 1 },
            },
          },
        ]),
      ])

      res.json({
        success: true,
        data: {
          overview: {
            totalQuizzes,
            completedQuizzes,
            averageScore: averageScore[0]?.avgScore || 0,
            completionRate: totalQuizzes > 0 ? ((completedQuizzes / totalQuizzes) * 100).toFixed(2) : 0,
          },
          subjectPerformance,
          difficultyStats,
        },
      })
    } catch (error) {
      console.error("Get quiz analytics error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch quiz analytics",
      })
    }
  },

  // Get all transactions
  async getAllTransactions(req, res) {
    try {
      const { page = 1, limit = 50, type, status, userId } = req.query
      const query = {}

      if (type) query.type = type
      if (status) query.status = status
      if (userId) query.user = userId

      const transactions = await Transaction.find(query)
        .populate("user", "username email")
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit))
        .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))

      const total = await Transaction.countDocuments(query)

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total,
            pages: Math.ceil(total / Number.parseInt(limit)),
          },
        },
      })
    } catch (error) {
      console.error("Get all transactions error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch transactions",
      })
    }
  },

  // Get transaction analytics
  async getTransactionAnalytics(req, res) {
    try {
      const [totalTransactions, completedTransactions, totalRevenue, transactionTypes, monthlyRevenue] =
        await Promise.all([
          Transaction.countDocuments(),
          Transaction.countDocuments({ status: "completed" }),
          Transaction.aggregate([
            { $match: { status: "completed", type: "coin_purchase" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Transaction.aggregate([
            { $group: { _id: "$type", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
            { $sort: { count: -1 } },
          ]),
          Transaction.aggregate([
            { $match: { status: "completed", type: "coin_purchase" } },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                revenue: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 },
          ]),
        ])

      res.json({
        success: true,
        data: {
          overview: {
            totalTransactions,
            completedTransactions,
            totalRevenue: totalRevenue[0]?.total || 0,
            successRate: totalTransactions > 0 ? ((completedTransactions / totalTransactions) * 100).toFixed(2) : 0,
          },
          transactionTypes,
          monthlyRevenue,
        },
      })
    } catch (error) {
      console.error("Get transaction analytics error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch transaction analytics",
      })
    }
  },

  // Get all rewards
  async getAllRewards(req, res) {
    try {
      const { page = 1, limit = 50, type, status } = req.query
      const query = {}

      if (type) query.type = type
      if (status) query.status = status

      const rewards = await Reward.find(query)
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit))
        .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))

      const total = await Reward.countDocuments(query)

      res.json({
        success: true,
        data: {
          rewards,
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total,
            pages: Math.ceil(total / Number.parseInt(limit)),
          },
        },
      })
    } catch (error) {
      console.error("Get all rewards error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch rewards",
      })
    }
  },

  // Create reward
  async createReward(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const reward = new Reward(req.body)
      await reward.save()

      res.status(201).json({
        success: true,
        message: "Reward created successfully",
        data: reward,
      })
    } catch (error) {
      console.error("Create reward error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create reward",
      })
    }
  },

  // Update reward
  async updateReward(req, res) {
    try {
      const { rewardId } = req.params

      const reward = await Reward.findByIdAndUpdate(rewardId, req.body, { new: true, runValidators: true })

      if (!reward) {
        return res.status(404).json({
          success: false,
          message: "Reward not found",
        })
      }

      res.json({
        success: true,
        message: "Reward updated successfully",
        data: reward,
      })
    } catch (error) {
      console.error("Update reward error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update reward",
      })
    }
  },

  // Delete reward
  async deleteReward(req, res) {
    try {
      const { rewardId } = req.params

      const reward = await Reward.findByIdAndDelete(rewardId)
      if (!reward) {
        return res.status(404).json({
          success: false,
          message: "Reward not found",
        })
      }

      res.json({
        success: true,
        message: "Reward deleted successfully",
      })
    } catch (error) {
      console.error("Delete reward error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete reward",
      })
    }
  },

  // Get system settings
  async getSystemSettings(req, res) {
    try {
      // Mock system settings - in production, store in database
      const settings = {
        coinRates: {
          correctAnswer: 10,
          streakBonus: 5,
          dailyLogin: 20,
        },
        quizSettings: {
          questionsPerQuiz: 10,
          timePerQuestion: 30,
          passingScore: 70,
        },
        rewardSettings: {
          airtimeRate: 0.1,
          dataRate: 0.1,
          minimumRedemption: 100,
        },
      }

      res.json({
        success: true,
        data: settings,
      })
    } catch (error) {
      console.error("Get system settings error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch system settings",
      })
    }
  },

  // Update system settings
  async updateSystemSettings(req, res) {
    try {
      // In production, save to database
      res.json({
        success: true,
        message: "System settings updated successfully",
        data: req.body,
      })
    } catch (error) {
      console.error("Update system settings error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update system settings",
      })
    }
  },

  // Get user report
  async getUserReport(req, res) {
    try {
      const { startDate, endDate } = req.query
      const dateFilter = {}

      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }

      const [newUsers, activeUsers, usersByRole, topPerformers] = await Promise.all([
        User.countDocuments(dateFilter),
        User.countDocuments({
          ...dateFilter,
          lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        User.aggregate([{ $match: dateFilter }, { $group: { _id: "$role", count: { $sum: 1 } } }]),
        User.find(dateFilter)
          .sort({ totalExperience: -1 })
          .limit(10)
          .select("username email totalExperience totalCoins"),
      ])

      res.json({
        success: true,
        data: {
          newUsers,
          activeUsers,
          usersByRole,
          topPerformers,
        },
      })
    } catch (error) {
      console.error("Get user report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate user report",
      })
    }
  },

  // Get performance report
  async getPerformanceReport(req, res) {
    try {
      const { startDate, endDate } = req.query
      const dateFilter = {}

      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }

      const [quizPerformance, subjectAnalysis, difficultyAnalysis] = await Promise.all([
        Quiz.aggregate([
          { $match: { ...dateFilter, status: "completed" } },
          {
            $group: {
              _id: null,
              totalQuizzes: { $sum: 1 },
              averageScore: { $avg: "$score" },
              averageTime: { $avg: "$timeSpent" },
            },
          },
        ]),
        Quiz.aggregate([
          { $match: { ...dateFilter, status: "completed" } },
          { $unwind: "$questions" },
          { $lookup: { from: "questions", localField: "questions", foreignField: "_id", as: "questionData" } },
          { $unwind: "$questionData" },
          {
            $group: {
              _id: "$questionData.subject",
              averageScore: { $avg: "$score" },
              totalQuizzes: { $sum: 1 },
            },
          },
          { $sort: { averageScore: -1 } },
        ]),
        Quiz.aggregate([
          { $match: { ...dateFilter, status: "completed" } },
          { $unwind: "$questions" },
          { $lookup: { from: "questions", localField: "questions", foreignField: "_id", as: "questionData" } },
          { $unwind: "$questionData" },
          {
            $group: {
              _id: "$questionData.difficulty",
              averageScore: { $avg: "$score" },
              totalQuizzes: { $sum: 1 },
            },
          },
        ]),
      ])

      res.json({
        success: true,
        data: {
          quizPerformance: quizPerformance[0] || {},
          subjectAnalysis,
          difficultyAnalysis,
        },
      })
    } catch (error) {
      console.error("Get performance report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate performance report",
      })
    }
  },

  // Get revenue report
  async getRevenueReport(req, res) {
    try {
      const { startDate, endDate } = req.query
      const dateFilter = {}

      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }

      const [totalRevenue, revenueByType, monthlyRevenue, topSpenders] = await Promise.all([
        Transaction.aggregate([
          { $match: { ...dateFilter, status: "completed", type: "coin_purchase" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Transaction.aggregate([
          { $match: { ...dateFilter, status: "completed" } },
          { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ]),
        Transaction.aggregate([
          { $match: { ...dateFilter, status: "completed", type: "coin_purchase" } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              revenue: { $sum: "$amount" },
              transactions: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": -1, "_id.month": -1 } },
        ]),
        Transaction.aggregate([
          { $match: { ...dateFilter, status: "completed", type: "coin_purchase" } },
          { $group: { _id: "$user", totalSpent: { $sum: "$amount" } } },
          { $sort: { totalSpent: -1 } },
          { $limit: 10 },
          { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userData" } },
          { $unwind: "$userData" },
          { $project: { username: "$userData.username", email: "$userData.email", totalSpent: 1 } },
        ]),
      ])

      res.json({
        success: true,
        data: {
          totalRevenue: totalRevenue[0]?.total || 0,
          revenueByType,
          monthlyRevenue,
          topSpenders,
        },
      })
    } catch (error) {
      console.error("Get revenue report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate revenue report",
      })
    }
  },
}

module.exports = adminController
