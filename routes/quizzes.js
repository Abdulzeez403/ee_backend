const express = require("express")
const Quiz = require("../models/Quiz")
const Question = require("../models/Question")
const User = require("../models/User")
const Transaction = require("../models/Transaction")
const { authenticateToken } = require("../middleware/auth")
const { validate, quizSchemas } = require("../middleware/validation")
const { calculateCoinReward, paginate } = require("../utils/helpers")
const AuthController = require("../controllers/authController")

const router = express.Router()

// Start a new quiz
router.post("/start", authenticateToken, validate(quizSchemas.start), async (req, res) => {
  try {
    const { subject, examType, difficulty, questionCount = 10 } = req.body
    const userId = req.user._id

    // Build question filter
    const filter = {
      subject,
      examType,
      isActive: true,
    }

    if (difficulty !== "mixed") {
      filter.difficulty = difficulty
    }

    // Get random questions
    const questions = await Question.aggregate([{ $match: filter }, { $sample: { size: questionCount } }])

    if (questions.length === 0) {
      return res.status(404).json({ message: "No questions found for the specified criteria" })
    }

    // Create quiz
    const quiz = new Quiz({
      user: userId,
      subject,
      examType,
      difficulty,
      totalQuestions: questions.length,
      questions: questions.map((q) => ({
        question: q._id,
        userAnswer: "",
        isCorrect: false,
        timeSpent: 0,
        coinsEarned: 0,
        experienceEarned: 0,
      })),
    })

    await quiz.save()
    await quiz.populate("questions.question", "question options image coinReward experienceReward")

    // Don't send correct answers to client
    const quizData = quiz.toObject()
    quizData.questions.forEach((q) => {
      if (q.question.options) {
        q.question.options.forEach((option) => {
          delete option.isCorrect
        })
      }
      delete q.question.correctAnswer
    })

    res.status(201).json({
      message: "Quiz started successfully",
      quiz: quizData,
    })
  } catch (error) {
    console.error("Start quiz error:", error)
    res.status(500).json({ message: "Failed to start quiz" })
  }
})

// Submit answer for a question
router.post("/:quizId/answer", authenticateToken, validate(quizSchemas.submitAnswer), async (req, res) => {
  try {
    const { quizId } = req.params
    const { questionId, answer, timeSpent = 0 } = req.body
    const userId = req.user._id

    const quiz = await Quiz.findOne({ _id: quizId, user: userId, status: "in-progress" }).populate("questions.question")

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found or already completed" })
    }

    // Find the question in the quiz
    const questionIndex = quiz.questions.findIndex((q) => q.question._id.toString() === questionId)
    if (questionIndex === -1) {
      return res.status(404).json({ message: "Question not found in this quiz" })
    }

    const quizQuestion = quiz.questions[questionIndex]
    const question = quizQuestion.question

    // Check if already answered
    if (quizQuestion.userAnswer) {
      return res.status(400).json({ message: "Question already answered" })
    }

    // Check if answer is correct
    const isCorrect = question.correctAnswer === answer

    // Calculate rewards
    let coinsEarned = 0
    let experienceEarned = 0

    if (isCorrect) {
      coinsEarned = question.coinReward
      experienceEarned = question.experienceReward

      // Apply difficulty multiplier
      const difficultyMultiplier = { easy: 1, medium: 1.2, hard: 1.5 }
      const multiplier = difficultyMultiplier[question.difficulty] || 1

      coinsEarned = Math.floor(coinsEarned * multiplier)
      experienceEarned = Math.floor(experienceEarned * multiplier)
    }

    // Update quiz question
    quizQuestion.userAnswer = answer
    quizQuestion.isCorrect = isCorrect
    quizQuestion.timeSpent = timeSpent
    quizQuestion.coinsEarned = coinsEarned
    quizQuestion.experienceEarned = experienceEarned

    // Update question statistics
    await question.updateStats(isCorrect, timeSpent)

    await quiz.save()

    // Check if quiz is completed
    const answeredQuestions = quiz.questions.filter((q) => q.userAnswer).length
    const isQuizCompleted = answeredQuestions === quiz.totalQuestions

    let completedQuiz = null
    if (isQuizCompleted) {
      completedQuiz = await completeQuiz(quiz, userId)
    }

    res.json({
      message: "Answer submitted successfully",
      isCorrect,
      coinsEarned,
      experienceEarned,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      isQuizCompleted,
      quiz: completedQuiz || quiz,
    })
  } catch (error) {
    console.error("Submit answer error:", error)
    res.status(500).json({ message: "Failed to submit answer" })
  }
})

// Complete quiz helper function
async function completeQuiz(quiz, userId) {
  try {
    // Update user streak
    const streak = await AuthController.updateStreak(userId)

    // Apply streak bonus
    if (streak >= 3) {
      quiz.streakBonus = streak * 5 // 5 coins per streak day
      quiz.bonusMultiplier = 1 + streak * 0.1 // 10% bonus per streak day
    }

    // Calculate final results
    quiz.calculateResults()
    await quiz.complete()

    // Update user coins and experience
    const user = await User.findById(userId)
    await user.addCoins(quiz.totalCoinsEarned)

    user.experience += quiz.totalExperienceEarned
    user.totalScore += quiz.score
    user.calculateLevel()
    await user.save()

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: "quiz_reward",
      amount: 0,
      coins: quiz.totalCoinsEarned,
      description: `Quiz completed: ${quiz.subject} - ${quiz.examType}`,
      status: "completed",
      quiz: quiz._id,
      metadata: {
        score: quiz.score,
        percentage: quiz.percentage,
        streak: streak,
      },
    })
    await transaction.save()

    await quiz.populate("questions.question", "question correctAnswer explanation")
    return quiz
  } catch (error) {
    console.error("Complete quiz error:", error)
    throw error
  }
}

// Get quiz by ID
router.get("/:quizId", authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params
    const userId = req.user._id

    const quiz = await Quiz.findOne({ _id: quizId, user: userId }).populate("questions.question")

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" })
    }

    // If quiz is in progress, don't show correct answers
    if (quiz.status === "in-progress") {
      const quizData = quiz.toObject()
      quizData.questions.forEach((q) => {
        if (q.question.options) {
          q.question.options.forEach((option) => {
            delete option.isCorrect
          })
        }
        delete q.question.correctAnswer
      })
      return res.json({ quiz: quizData })
    }

    res.json({ quiz })
  } catch (error) {
    console.error("Get quiz error:", error)
    res.status(500).json({ message: "Failed to get quiz" })
  }
})

// Get user's quiz history
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, examType, status } = req.query
    const { skip, limit: limitNum } = paginate(page, limit)
    const userId = req.user._id

    const filter = { user: userId }
    if (subject) filter.subject = subject
    if (examType) filter.examType = examType
    if (status) filter.status = status

    const quizzes = await Quiz.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select(
        "subject examType score percentage totalQuestions correctAnswers status startedAt completedAt totalTimeSpent",
      )

    const total = await Quiz.countDocuments(filter)

    res.json({
      quizzes,
      pagination: {
        page: Number.parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("Get quiz history error:", error)
    res.status(500).json({ message: "Failed to get quiz history" })
  }
})

// Abandon quiz
router.post("/:quizId/abandon", authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params
    const userId = req.user._id

    const quiz = await Quiz.findOne({ _id: quizId, user: userId, status: "in-progress" })
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found or already completed" })
    }

    quiz.status = "abandoned"
    await quiz.save()

    res.json({ message: "Quiz abandoned successfully" })
  } catch (error) {
    console.error("Abandon quiz error:", error)
    res.status(500).json({ message: "Failed to abandon quiz" })
  }
})

// Get quiz statistics for user
router.get("/stats/summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id

    const stats = await Quiz.aggregate([
      { $match: { user: userId, status: "completed" } },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          totalScore: { $sum: "$score" },
          totalTimeSpent: { $sum: "$totalTimeSpent" },
          totalCoinsEarned: { $sum: "$totalCoinsEarned" },
          totalExperienceEarned: { $sum: "$totalExperienceEarned" },
        },
      },
    ])

    const subjectStats = await Quiz.aggregate([
      { $match: { user: userId, status: "completed" } },
      {
        $group: {
          _id: "$subject",
          quizCount: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          bestScore: { $max: "$percentage" },
          totalTimeSpent: { $sum: "$totalTimeSpent" },
        },
      },
      { $sort: { averageScore: -1 } },
    ])

    const recentActivity = await Quiz.find({ user: userId, status: "completed" })
      .sort({ completedAt: -1 })
      .limit(5)
      .select("subject examType score percentage completedAt")

    res.json({
      overall: stats[0] || {
        totalQuizzes: 0,
        averageScore: 0,
        totalScore: 0,
        totalTimeSpent: 0,
        totalCoinsEarned: 0,
        totalExperienceEarned: 0,
      },
      bySubject: subjectStats,
      recentActivity,
    })
  } catch (error) {
    console.error("Get quiz stats error:", error)
    res.status(500).json({ message: "Failed to get quiz statistics" })
  }
})

module.exports = router
