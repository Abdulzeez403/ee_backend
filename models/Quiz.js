const mongoose = require("mongoose")

const quizSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questions: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        userAnswer: String,
        isCorrect: Boolean,
        timeSpent: { type: Number, default: 0 }, // in seconds
        coinsEarned: { type: Number, default: 0 },
        experienceEarned: { type: Number, default: 0 },
      },
    ],
    subject: {
      type: String,
      required: true,
    },
    examType: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "mixed"],
      default: "mixed",
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    totalCoinsEarned: {
      type: Number,
      default: 0,
    },
    totalExperienceEarned: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in-progress", "completed", "abandoned"],
      default: "in-progress",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    bonusMultiplier: {
      type: Number,
      default: 1,
    },
    streakBonus: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
quizSchema.index({ user: 1, createdAt: -1 })
quizSchema.index({ subject: 1, examType: 1 })
quizSchema.index({ status: 1 })

// Calculate final score and rewards
quizSchema.methods.calculateResults = function () {
  this.correctAnswers = this.questions.filter((q) => q.isCorrect).length
  this.percentage = (this.correctAnswers / this.totalQuestions) * 100
  this.score = this.correctAnswers * 10 // Base score

  // Apply bonus multiplier
  this.score *= this.bonusMultiplier

  // Calculate total rewards
  this.totalCoinsEarned = this.questions.reduce((total, q) => total + q.coinsEarned, 0)
  this.totalExperienceEarned = this.questions.reduce((total, q) => total + q.experienceEarned, 0)
  this.totalTimeSpent = this.questions.reduce((total, q) => total + q.timeSpent, 0)

  // Add streak bonus
  if (this.streakBonus > 0) {
    this.totalCoinsEarned += this.streakBonus
    this.totalExperienceEarned += this.streakBonus * 2
  }

  return this
}

// Mark quiz as completed
quizSchema.methods.complete = function () {
  this.status = "completed"
  this.completedAt = new Date()
  this.calculateResults()
  return this.save()
}

module.exports = mongoose.model("Quiz", quizSchema)
