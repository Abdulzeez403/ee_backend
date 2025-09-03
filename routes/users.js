// const express = require("express")
// const User = require("../models/User")
// const Quiz = require("../models/Quiz")
// const Transaction = require("../models/Transaction")
// const { authenticateToken, requireAdmin } = require("../middleware/auth")
// const { paginate } = require("../utils/helpers")

// const router = express.Router()

// // Get user statistics
// router.get("/stats", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user._id

//     // Get user with basic stats
//     const user = await User.findById(userId).select("-password -refreshTokens")

//     // Get quiz statistics
//     const quizStats = await Quiz.aggregate([
//       { $match: { user: userId, status: "completed" } },
//       {
//         $group: {
//           _id: null,
//           totalQuizzes: { $sum: 1 },
//           totalScore: { $sum: "$score" },
//           averageScore: { $avg: "$percentage" },
//           totalTimeSpent: { $sum: "$totalTimeSpent" },
//           totalCoinsEarned: { $sum: "$totalCoinsEarned" },
//           totalExperienceEarned: { $sum: "$totalExperienceEarned" },
//         },
//       },
//     ])

//     // Get subject-wise performance
//     const subjectStats = await Quiz.aggregate([
//       { $match: { user: userId, status: "completed" } },
//       {
//         $group: {
//           _id: "$subject",
//           quizCount: { $sum: 1 },
//           averageScore: { $avg: "$percentage" },
//           totalScore: { $sum: "$score" },
//         },
//       },
//       { $sort: { averageScore: -1 } },
//     ])

//     // Get recent activity
//     const recentQuizzes = await Quiz.find({ user: userId, status: "completed" })
//       .sort({ completedAt: -1 })
//       .limit(5)
//       .select("subject examType score percentage completedAt")

//     const stats = quizStats[0] || {
//       totalQuizzes: 0,
//       totalScore: 0,
//       averageScore: 0,
//       totalTimeSpent: 0,
//       totalCoinsEarned: 0,
//       totalExperienceEarned: 0,
//     }

//     res.json({
//       user,
//       stats,
//       subjectStats,
//       recentQuizzes,
//     })
//   } catch (error) {
//     console.error("Get user stats error:", error)
//     res.status(500).json({ message: "Failed to get user statistics" })
//   }
// })

// // Get user achievements
// router.get("/achievements", authenticateToken, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select("achievements")
//     res.json({ achievements: user.achievements })
//   } catch (error) {
//     console.error("Get achievements error:", error)
//     res.status(500).json({ message: "Failed to get achievements" })
//   }
// })

// // Get user transaction history
// router.get("/transactions", authenticateToken, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, type } = req.query
//     const { skip, limit: limitNum } = paginate(page, limit)

//     const filter = { user: req.user._id }
//     if (type) filter.type = type

//     const transactions = await Transaction.find(filter)
//       .populate("reward", "name type value")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum)

//     const total = await Transaction.countDocuments(filter)

//     res.json({
//       transactions,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("Get transactions error:", error)
//     res.status(500).json({ message: "Failed to get transaction history" })
//   }
// })

// // Get user quiz history
// router.get("/quiz-history", authenticateToken, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, subject, examType } = req.query
//     const { skip, limit: limitNum } = paginate(page, limit)

//     const filter = { user: req.user._id, status: "completed" }
//     if (subject) filter.subject = subject
//     if (examType) filter.examType = examType

//     const quizzes = await Quiz.find(filter)
//       .sort({ completedAt: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .select("subject examType score percentage totalQuestions correctAnswers completedAt totalTimeSpent")

//     const total = await Quiz.countDocuments(filter)

//     res.json({
//       quizzes,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("Get quiz history error:", error)
//     res.status(500).json({ message: "Failed to get quiz history" })
//   }
// })

// // Update user level and experience (internal use)
// router.put("/update-experience", authenticateToken, async (req, res) => {
//   try {
//     const { experience, subject } = req.body
//     const user = await User.findById(req.user._id)

//     // Add experience
//     user.experience += experience

//     // Update subject-specific experience
//     if (subject) {
//       const subjectIndex = user.subjects.findIndex((s) => s.name === subject)
//       if (subjectIndex >= 0) {
//         user.subjects[subjectIndex].experience += experience
//         user.subjects[subjectIndex].level = Math.floor(user.subjects[subjectIndex].experience / 500) + 1
//       } else {
//         user.subjects.push({
//           name: subject,
//           experience,
//           level: Math.floor(experience / 500) + 1,
//         })
//       }
//     }

//     // Calculate new level
//     user.calculateLevel()

//     await user.save()

//     res.json({
//       message: "Experience updated successfully",
//       user: {
//         level: user.level,
//         experience: user.experience,
//         subjects: user.subjects,
//       },
//     })
//   } catch (error) {
//     console.error("Update experience error:", error)
//     res.status(500).json({ message: "Failed to update experience" })
//   }
// })

// // Admin: Get all users
// router.get("/", authenticateToken, requireAdmin, async (req, res) => {
//   try {
//     const { page = 1, limit = 20, search, role, isActive } = req.query
//     const { skip, limit: limitNum } = paginate(page, limit)

//     const filter = {}
//     if (search) {
//       filter.$or = [
//         { username: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//         { firstName: { $regex: search, $options: "i" } },
//         { lastName: { $regex: search, $options: "i" } },
//       ]
//     }
//     if (role) filter.role = role
//     if (isActive !== undefined) filter.isActive = isActive === "true"

//     const users = await User.find(filter)
//       .select("-password -refreshTokens")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum)

//     const total = await User.countDocuments(filter)

//     res.json({
//       users,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("Get users error:", error)
//     res.status(500).json({ message: "Failed to get users" })
//   }
// })

// // Admin: Update user role or status
// router.put("/:userId", authenticateToken, requireAdmin, async (req, res) => {
//   try {
//     const { userId } = req.params
//     const { role, isActive, isVerified } = req.body

//     const user = await User.findById(userId).select("-password -refreshTokens")
//     if (!user) {
//       return res.status(404).json({ message: "User not found" })
//     }

//     if (role) user.role = role
//     if (isActive !== undefined) user.isActive = isActive
//     if (isVerified !== undefined) user.isVerified = isVerified

//     await user.save()

//     res.json({
//       message: "User updated successfully",
//       user,
//     })
//   } catch (error) {
//     console.error("Update user error:", error)
//     res.status(500).json({ message: "Failed to update user" })
//   }
// })

// module.exports = router
