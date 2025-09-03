// const express = require("express")
// const Question = require("../models/Question")
// const { authenticateToken, requireModerator } = require("../middleware/auth")
// const { validate, questionSchemas } = require("../middleware/validation")
// const { paginate } = require("../utils/helpers")

// const router = express.Router()

// // Get questions with filters
// router.get("/", async (req, res) => {
//   try {
//     const { page = 1, limit = 20, subject, examType, difficulty, year, tags, search } = req.query

//     const { skip, limit: limitNum } = paginate(page, limit)

//     // Build filter object
//     const filter = { isActive: true }
//     if (subject) filter.subject = subject
//     if (examType) filter.examType = examType
//     if (difficulty) filter.difficulty = difficulty
//     if (year) filter.year = year
//     if (tags) filter.tags = { $in: tags.split(",") }
//     if (search) {
//       filter.$or = [
//         { question: { $regex: search, $options: "i" } },
//         { explanation: { $regex: search, $options: "i" } },
//         { tags: { $regex: search, $options: "i" } },
//       ]
//     }

//     const questions = await Question.find(filter)
//       .populate("createdBy", "username firstName lastName")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .select("-correctAnswer") // Don't expose correct answer in list view

//     const total = await Question.countDocuments(filter)

//     res.json({
//       questions,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("Get questions error:", error)
//     res.status(500).json({ message: "Failed to get questions" })
//   }
// })

// // Get single question by ID
// router.get("/:id", async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.id).populate("createdBy", "username firstName lastName")

//     if (!question || !question.isActive) {
//       return res.status(404).json({ message: "Question not found" })
//     }

//     // Don't expose correct answer unless user is moderator
//     const questionData = question.toObject()
//     if (!req.user || !["admin", "moderator"].includes(req.user.role)) {
//       delete questionData.correctAnswer
//     }

//     res.json({ question: questionData })
//   } catch (error) {
//     console.error("Get question error:", error)
//     res.status(500).json({ message: "Failed to get question" })
//   }
// })

// // Create new question (moderators only)
// router.post("/", authenticateToken, requireModerator, validate(questionSchemas.create), async (req, res) => {
//   try {
//     const questionData = {
//       ...req.body,
//       createdBy: req.user._id,
//     }

//     // Validate that at least one option is marked as correct
//     const correctOptions = questionData.options.filter((option) => option.isCorrect)
//     if (correctOptions.length !== 1) {
//       return res.status(400).json({ message: "Exactly one option must be marked as correct" })
//     }

//     const question = new Question(questionData)
//     await question.save()

//     await question.populate("createdBy", "username firstName lastName")

//     res.status(201).json({
//       message: "Question created successfully",
//       question,
//     })
//   } catch (error) {
//     console.error("Create question error:", error)
//     res.status(500).json({ message: "Failed to create question" })
//   }
// })

// // Update question (moderators only)
// router.put("/:id", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.id)
//     if (!question) {
//       return res.status(404).json({ message: "Question not found" })
//     }

//     // Update fields
//     const allowedUpdates = [
//       "question",
//       "options",
//       "correctAnswer",
//       "explanation",
//       "subject",
//       "examType",
//       "difficulty",
//       "year",
//       "tags",
//       "image",
//     ]

//     allowedUpdates.forEach((field) => {
//       if (req.body[field] !== undefined) {
//         question[field] = req.body[field]
//       }
//     })

//     // Validate correct answer if options are updated
//     if (req.body.options) {
//       const correctOptions = question.options.filter((option) => option.isCorrect)
//       if (correctOptions.length !== 1) {
//         return res.status(400).json({ message: "Exactly one option must be marked as correct" })
//       }
//     }

//     await question.save()
//     await question.populate("createdBy", "username firstName lastName")

//     res.json({
//       message: "Question updated successfully",
//       question,
//     })
//   } catch (error) {
//     console.error("Update question error:", error)
//     res.status(500).json({ message: "Failed to update question" })
//   }
// })

// // Delete question (soft delete)
// router.delete("/:id", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.id)
//     if (!question) {
//       return res.status(404).json({ message: "Question not found" })
//     }

//     question.isActive = false
//     await question.save()

//     res.json({ message: "Question deleted successfully" })
//   } catch (error) {
//     console.error("Delete question error:", error)
//     res.status(500).json({ message: "Failed to delete question" })
//   }
// })

// // Get question statistics
// router.get("/:id/stats", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.id)
//     if (!question) {
//       return res.status(404).json({ message: "Question not found" })
//     }

//     const stats = {
//       timesAnswered: question.timesAnswered,
//       timesCorrect: question.timesCorrect,
//       successRate: question.successRate,
//       averageTime: question.averageTime,
//       difficulty: question.difficulty,
//       coinReward: question.coinReward,
//       experienceReward: question.experienceReward,
//     }

//     res.json({ stats })
//   } catch (error) {
//     console.error("Get question stats error:", error)
//     res.status(500).json({ message: "Failed to get question statistics" })
//   }
// })

// // Get available subjects and exam types
// router.get("/meta/options", async (req, res) => {
//   try {
//     const subjects = await Question.distinct("subject", { isActive: true })
//     const examTypes = await Question.distinct("examType", { isActive: true })
//     const years = await Question.distinct("year", { isActive: true })

//     res.json({
//       subjects: subjects.sort(),
//       examTypes: examTypes.sort(),
//       years: years.sort((a, b) => b - a), // Latest years first
//       difficulties: ["easy", "medium", "hard"],
//     })
//   } catch (error) {
//     console.error("Get question options error:", error)
//     res.status(500).json({ message: "Failed to get question options" })
//   }
// })

// // Bulk import questions (admin only)
// router.post("/bulk-import", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const { questions } = req.body

//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ message: "Questions array is required" })
//     }

//     const validQuestions = []
//     const errors = []

//     // Validate each question
//     for (let i = 0; i < questions.length; i++) {
//       try {
//         const { error } = questionSchemas.create.validate(questions[i])
//         if (error) {
//           errors.push({ index: i, error: error.details[0].message })
//           continue
//         }

//         // Check correct answer validation
//         const correctOptions = questions[i].options.filter((option) => option.isCorrect)
//         if (correctOptions.length !== 1) {
//           errors.push({ index: i, error: "Exactly one option must be marked as correct" })
//           continue
//         }

//         validQuestions.push({
//           ...questions[i],
//           createdBy: req.user._id,
//         })
//       } catch (err) {
//         errors.push({ index: i, error: err.message })
//       }
//     }

//     // Insert valid questions
//     let insertedQuestions = []
//     if (validQuestions.length > 0) {
//       insertedQuestions = await Question.insertMany(validQuestions)
//     }

//     res.json({
//       message: `Bulk import completed. ${insertedQuestions.length} questions imported successfully.`,
//       imported: insertedQuestions.length,
//       errors: errors.length,
//       errorDetails: errors,
//     })
//   } catch (error) {
//     console.error("Bulk import error:", error)
//     res.status(500).json({ message: "Failed to import questions" })
//   }
// })

// module.exports = router
