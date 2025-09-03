const mongoose = require("mongoose")

const leaderboardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "all-time"],
      required: true,
    },
    subject: {
      type: String,
      default: "all",
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    quizzesCompleted: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: 0,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Compound indexes for efficient querying
leaderboardSchema.index({ period: 1, subject: 1, score: -1 })
leaderboardSchema.index({ user: 1, period: 1, subject: 1 })
leaderboardSchema.index({ periodStart: 1, periodEnd: 1 })

// Update leaderboard entry
leaderboardSchema.methods.updateStats = function (quizData) {
  this.score += quizData.score
  this.quizzesCompleted += 1
  this.totalTimeSpent += quizData.timeSpent
  this.averageScore = this.score / this.quizzesCompleted
  this.lastUpdated = new Date()

  return this.save()
}

module.exports = mongoose.model("Leaderboard", leaderboardSchema)
