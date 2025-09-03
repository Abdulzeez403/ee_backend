const Quiz = require("../models/Quiz")
const Question = require("../models/Question")
const User = require("../models/User")

class QuizService {
  // Get recommended questions for user
  static async getRecommendedQuestions(userId, subject, examType, count = 10) {
    try {
      const user = await User.findById(userId)

      // Get user's recent performance
      const recentQuizzes = await Quiz.find({
        user: userId,
        subject,
        status: "completed",
      })
        .sort({ completedAt: -1 })
        .limit(10)
        .populate("questions.question")

      // Analyze performance patterns
      const performanceAnalysis = this.analyzeUserPerformance(recentQuizzes)

      // Build question selection criteria
      const criteria = this.buildSelectionCriteria(performanceAnalysis, user.level)

      // Get questions based on criteria
      const questions = await this.selectQuestions(subject, examType, criteria, count)

      return questions
    } catch (error) {
      throw error
    }
  }

  // Analyze user performance patterns
  static analyzeUserPerformance(quizzes) {
    const analysis = {
      averageScore: 0,
      weakTopics: [],
      strongTopics: [],
      difficultyPreference: "medium",
      timePatterns: {},
    }

    if (quizzes.length === 0) return analysis

    // Calculate average score
    const totalScore = quizzes.reduce((sum, quiz) => sum + quiz.percentage, 0)
    analysis.averageScore = totalScore / quizzes.length

    // Analyze topics
    const topicPerformance = {}
    quizzes.forEach((quiz) => {
      quiz.questions.forEach((q) => {
        if (q.question && q.question.tags) {
          q.question.tags.forEach((tag) => {
            if (!topicPerformance[tag]) {
              topicPerformance[tag] = { correct: 0, total: 0 }
            }
            topicPerformance[tag].total++
            if (q.isCorrect) topicPerformance[tag].correct++
          })
        }
      })
    })

    // Categorize topics
    Object.keys(topicPerformance).forEach((topic) => {
      const accuracy = (topicPerformance[topic].correct / topicPerformance[topic].total) * 100
      if (accuracy < 60) {
        analysis.weakTopics.push(topic)
      } else if (accuracy > 80) {
        analysis.strongTopics.push(topic)
      }
    })

    return analysis
  }

  // Build question selection criteria
  static buildSelectionCriteria(analysis, userLevel) {
    const criteria = {
      difficultyDistribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
      focusOnWeakTopics: true,
      excludeRecentQuestions: true,
      adaptiveDifficulty: true,
    }

    // Adjust difficulty based on performance
    if (analysis.averageScore < 50) {
      criteria.difficultyDistribution = { easy: 0.6, medium: 0.3, hard: 0.1 }
    } else if (analysis.averageScore > 85) {
      criteria.difficultyDistribution = { easy: 0.1, medium: 0.4, hard: 0.5 }
    }

    // Adjust based on user level
    if (userLevel > 10) {
      criteria.difficultyDistribution.hard += 0.2
      criteria.difficultyDistribution.easy -= 0.2
    }

    return criteria
  }

  // Select questions based on criteria
  static async selectQuestions(subject, examType, criteria, count) {
    const pipeline = [
      {
        $match: {
          subject,
          examType,
          isActive: true,
        },
      },
    ]

    // Add difficulty-based sampling
    const easyCount = Math.floor(count * criteria.difficultyDistribution.easy)
    const mediumCount = Math.floor(count * criteria.difficultyDistribution.medium)
    const hardCount = count - easyCount - mediumCount

    const questions = []

    // Get questions by difficulty
    for (const [difficulty, targetCount] of [
      ["easy", easyCount],
      ["medium", mediumCount],
      ["hard", hardCount],
    ]) {
      if (targetCount > 0) {
        const difficultyQuestions = await Question.aggregate([
          { $match: { subject, examType, difficulty, isActive: true } },
          { $sample: { size: targetCount * 2 } }, // Get extra for selection
        ])

        questions.push(...difficultyQuestions.slice(0, targetCount))
      }
    }

    // Shuffle final selection
    return this.shuffleArray(questions)
  }

  // Shuffle array utility
  static shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Calculate quiz difficulty score
  static calculateQuizDifficulty(questions) {
    const difficultyScores = { easy: 1, medium: 2, hard: 3 }
    const totalScore = questions.reduce((sum, q) => sum + difficultyScores[q.difficulty], 0)
    return totalScore / questions.length
  }

  // Generate quiz summary
  static generateQuizSummary(quiz) {
    const summary = {
      performance: {
        score: quiz.percentage,
        grade: this.calculateGrade(quiz.percentage),
        timeSpent: quiz.totalTimeSpent,
        efficiency: quiz.totalTimeSpent / quiz.totalQuestions,
      },
      breakdown: {
        correct: quiz.correctAnswers,
        incorrect: quiz.totalQuestions - quiz.correctAnswers,
        total: quiz.totalQuestions,
      },
      rewards: {
        coins: quiz.totalCoinsEarned,
        experience: quiz.totalExperienceEarned,
        bonus: quiz.streakBonus,
      },
    }

    return summary
  }

  // Calculate grade based on percentage
  static calculateGrade(percentage) {
    if (percentage >= 90) return "A+"
    if (percentage >= 85) return "A"
    if (percentage >= 80) return "B+"
    if (percentage >= 75) return "B"
    if (percentage >= 70) return "C+"
    if (percentage >= 65) return "C"
    if (percentage >= 60) return "D+"
    if (percentage >= 55) return "D"
    return "F"
  }

  // Get quiz leaderboard
  static async getQuizLeaderboard(subject, examType, period = "weekly") {
    const dateFilter = this.getDateFilter(period)

    const leaderboard = await Quiz.aggregate([
      {
        $match: {
          subject,
          examType,
          status: "completed",
          completedAt: dateFilter,
        },
      },
      {
        $group: {
          _id: "$user",
          totalScore: { $sum: "$score" },
          averageScore: { $avg: "$percentage" },
          quizCount: { $sum: 1 },
          totalTime: { $sum: "$totalTimeSpent" },
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
          totalScore: 1,
          averageScore: 1,
          quizCount: 1,
          totalTime: 1,
        },
      },
      {
        $sort: { totalScore: -1 },
      },
      {
        $limit: 50,
      },
    ])

    return leaderboard
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
}

module.exports = QuizService
