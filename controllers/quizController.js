const Quiz = require("../models/Quiz")
const Question = require("../models/Question")
const User = require("../models/User")
const Transaction = require("../models/Transaction")

class QuizController {
  // Generate personalized quiz based on user performance
  static async generatePersonalizedQuiz(userId, subject, examType, questionCount = 10) {
    try {
      const user = await User.findById(userId)

      // Get user's performance history for this subject
      const userQuizzes = await Quiz.find({
        user: userId,
        subject,
        status: "completed",
      }).populate("questions.question")

      // Analyze weak areas
      const weakTopics = await this.analyzeWeakAreas(userQuizzes)

      // Build question filter with focus on weak areas
      const filter = {
        subject,
        examType,
        isActive: true,
      }

      // If user has weak areas, prioritize those topics
      if (weakTopics.length > 0) {
        filter.tags = { $in: weakTopics }
      }

      // Get questions with weighted selection
      const questions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: questionCount * 2 } }, // Get more than needed for selection
      ])

      // Select final questions based on difficulty progression
      const selectedQuestions = this.selectQuestionsWithProgression(questions, questionCount, user.level)

      return selectedQuestions
    } catch (error) {
      throw error
    }
  }

  // Analyze user's weak areas
  static async analyzeWeakAreas(userQuizzes) {
    const topicPerformance = {}

    userQuizzes.forEach((quiz) => {
      quiz.questions.forEach((q) => {
        if (q.question && q.question.tags) {
          q.question.tags.forEach((tag) => {
            if (!topicPerformance[tag]) {
              topicPerformance[tag] = { correct: 0, total: 0 }
            }
            topicPerformance[tag].total++
            if (q.isCorrect) {
              topicPerformance[tag].correct++
            }
          })
        }
      })
    })

    // Find topics with < 70% success rate
    const weakTopics = Object.keys(topicPerformance).filter((topic) => {
      const performance = topicPerformance[topic]
      return performance.correct / performance.total < 0.7
    })

    return weakTopics
  }

  // Select questions with difficulty progression
  static selectQuestionsWithProgression(questions, count, userLevel) {
    // Sort questions by difficulty
    const easyQuestions = questions.filter((q) => q.difficulty === "easy")
    const mediumQuestions = questions.filter((q) => q.difficulty === "medium")
    const hardQuestions = questions.filter((q) => q.difficulty === "hard")

    const selected = []

    // Determine distribution based on user level
    let easyCount, mediumCount, hardCount

    if (userLevel <= 3) {
      easyCount = Math.ceil(count * 0.6)
      mediumCount = Math.ceil(count * 0.3)
      hardCount = Math.floor(count * 0.1)
    } else if (userLevel <= 7) {
      easyCount = Math.ceil(count * 0.3)
      mediumCount = Math.ceil(count * 0.5)
      hardCount = Math.floor(count * 0.2)
    } else {
      easyCount = Math.ceil(count * 0.2)
      mediumCount = Math.ceil(count * 0.4)
      hardCount = Math.floor(count * 0.4)
    }

    // Select questions
    selected.push(...this.shuffleArray(easyQuestions).slice(0, easyCount))
    selected.push(...this.shuffleArray(mediumQuestions).slice(0, mediumCount))
    selected.push(...this.shuffleArray(hardQuestions).slice(0, hardCount))

    // Fill remaining slots if needed
    const remaining = count - selected.length
    if (remaining > 0) {
      const allRemaining = questions.filter((q) => !selected.includes(q))
      selected.push(...this.shuffleArray(allRemaining).slice(0, remaining))
    }

    return this.shuffleArray(selected).slice(0, count)
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

  // Calculate adaptive difficulty
  static calculateAdaptiveDifficulty(userPerformance) {
    const recentQuizzes = userPerformance.slice(-5) // Last 5 quizzes
    const averageScore = recentQuizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) / recentQuizzes.length

    if (averageScore >= 85) return "hard"
    if (averageScore >= 70) return "medium"
    return "easy"
  }

  // Generate quiz insights
  static async generateQuizInsights(quizId) {
    try {
      const quiz = await Quiz.findById(quizId)
        .populate("questions.question")
        .populate("user", "username level experience")

      if (!quiz || quiz.status !== "completed") {
        throw new Error("Quiz not found or not completed")
      }

      const insights = {
        performance: {
          score: quiz.percentage,
          timeEfficiency: this.calculateTimeEfficiency(quiz),
          accuracyByDifficulty: this.calculateAccuracyByDifficulty(quiz),
          strongAreas: [],
          weakAreas: [],
        },
        recommendations: [],
        achievements: [],
      }

      // Analyze performance by topic
      const topicPerformance = this.analyzeTopicPerformance(quiz)
      insights.performance.strongAreas = topicPerformance.strong
      insights.performance.weakAreas = topicPerformance.weak

      // Generate recommendations
      insights.recommendations = this.generateRecommendations(quiz, topicPerformance)

      // Check for achievements
      insights.achievements = await this.checkAchievements(quiz)

      return insights
    } catch (error) {
      throw error
    }
  }

  // Calculate time efficiency
  static calculateTimeEfficiency(quiz) {
    const averageTimePerQuestion = quiz.totalTimeSpent / quiz.totalQuestions
    const expectedTime = 60 // 60 seconds per question

    if (averageTimePerQuestion <= expectedTime * 0.7) return "excellent"
    if (averageTimePerQuestion <= expectedTime) return "good"
    if (averageTimePerQuestion <= expectedTime * 1.3) return "average"
    return "needs_improvement"
  }

  // Calculate accuracy by difficulty
  static calculateAccuracyByDifficulty(quiz) {
    const difficultyStats = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
    }

    quiz.questions.forEach((q) => {
      const difficulty = q.question.difficulty
      difficultyStats[difficulty].total++
      if (q.isCorrect) {
        difficultyStats[difficulty].correct++
      }
    })

    return {
      easy: difficultyStats.easy.total > 0 ? (difficultyStats.easy.correct / difficultyStats.easy.total) * 100 : 0,
      medium:
        difficultyStats.medium.total > 0 ? (difficultyStats.medium.correct / difficultyStats.medium.total) * 100 : 0,
      hard: difficultyStats.hard.total > 0 ? (difficultyStats.hard.correct / difficultyStats.hard.total) * 100 : 0,
    }
  }

  // Analyze topic performance
  static analyzeTopicPerformance(quiz) {
    const topicStats = {}

    quiz.questions.forEach((q) => {
      if (q.question.tags) {
        q.question.tags.forEach((tag) => {
          if (!topicStats[tag]) {
            topicStats[tag] = { correct: 0, total: 0 }
          }
          topicStats[tag].total++
          if (q.isCorrect) {
            topicStats[tag].correct++
          }
        })
      }
    })

    const strong = []
    const weak = []

    Object.keys(topicStats).forEach((topic) => {
      const accuracy = (topicStats[topic].correct / topicStats[topic].total) * 100
      if (accuracy >= 80) {
        strong.push({ topic, accuracy })
      } else if (accuracy < 60) {
        weak.push({ topic, accuracy })
      }
    })

    return { strong, weak }
  }

  // Generate recommendations
  static generateRecommendations(quiz, topicPerformance) {
    const recommendations = []

    // Performance-based recommendations
    if (quiz.percentage < 60) {
      recommendations.push({
        type: "study",
        message: "Focus on fundamental concepts before attempting more quizzes",
        priority: "high",
      })
    }

    // Time-based recommendations
    const timeEfficiency = this.calculateTimeEfficiency(quiz)
    if (timeEfficiency === "needs_improvement") {
      recommendations.push({
        type: "time_management",
        message: "Practice time management - aim to answer each question within 60 seconds",
        priority: "medium",
      })
    }

    // Topic-based recommendations
    if (topicPerformance.weak.length > 0) {
      recommendations.push({
        type: "topic_focus",
        message: `Focus on improving: ${topicPerformance.weak.map((w) => w.topic).join(", ")}`,
        priority: "high",
      })
    }

    return recommendations
  }

  // Check for achievements
  static async checkAchievements(quiz) {
    const achievements = []

    // Perfect score achievement
    if (quiz.percentage === 100) {
      achievements.push({
        name: "Perfect Score",
        description: "Answered all questions correctly!",
        icon: "🏆",
      })
    }

    // Speed achievement
    const averageTime = quiz.totalTimeSpent / quiz.totalQuestions
    if (averageTime < 30 && quiz.percentage >= 80) {
      achievements.push({
        name: "Speed Demon",
        description: "Completed quiz quickly with high accuracy!",
        icon: "⚡",
      })
    }

    // Streak achievements would be checked here
    // This would require checking user's quiz history

    return achievements
  }
}

module.exports = QuizController
