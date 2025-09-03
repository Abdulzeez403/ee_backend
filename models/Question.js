const mongoose = require("mongoose")

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    correctAnswer: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      required: true,
      enum: [
        "Mathematics",
        "English",
        "Physics",
        "Chemistry",
        "Biology",
        "Economics",
        "Government",
        "Literature",
        "Geography",
        "History",
      ],
    },
    examType: {
      type: String,
      required: true,
      enum: ["WAEC", "JAMB", "NECO", "GCE", "POST-UTME"],
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    year: {
      type: Number,
      min: 2000,
      max: new Date().getFullYear(),
    },
    tags: [String],
    image: {
      type: String,
      default: null,
    },
    coinReward: {
      type: Number,
      default: function () {
        const rewards = { easy: 5, medium: 10, hard: 15 }
        return rewards[this.difficulty] || 10
      },
    },
    experienceReward: {
      type: Number,
      default: function () {
        const rewards = { easy: 10, medium: 20, hard: 30 }
        return rewards[this.difficulty] || 20
      },
    },
    timesAnswered: {
      type: Number,
      default: 0,
    },
    timesCorrect: {
      type: Number,
      default: 0,
    },
    averageTime: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
questionSchema.index({ subject: 1, examType: 1 })
questionSchema.index({ difficulty: 1 })
questionSchema.index({ year: 1 })
questionSchema.index({ tags: 1 })

// Calculate success rate
questionSchema.virtual("successRate").get(function () {
  if (this.timesAnswered === 0) return 0
  return (this.timesCorrect / this.timesAnswered) * 100
})

// Update statistics when question is answered
questionSchema.methods.updateStats = function (isCorrect, timeSpent) {
  this.timesAnswered += 1
  if (isCorrect) {
    this.timesCorrect += 1
  }

  // Update average time
  this.averageTime = (this.averageTime * (this.timesAnswered - 1) + timeSpent) / this.timesAnswered

  return this.save()
}

module.exports = mongoose.model("Question", questionSchema)
