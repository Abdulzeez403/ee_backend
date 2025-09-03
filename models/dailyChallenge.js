const mongoose = require("mongoose");

// Question Schema
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length >= 2,
      message: "At least 2 options are required",
    },
  },
  correctAnswer: {
    type: Number,
    required: true,
    validate: {
      validator: function (val) {
        return this.options && val >= 0 && val < this.options.length;
      },
      message: "correctAnswer must be a valid index of options",
    },
  },
  explanation: { type: String, trim: true },
});

// Daily Challenge Schema
const dailyChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    exam: { type: String, required: true, trim: true },
    timeLimit: { type: Number, default: 600 }, // seconds
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    questions: [questionSchema],
  },
  { timestamps: true }
);

// Challenge Attempt Schema
const challengeAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyChallenge",
      required: true,
    },
    score: { type: Number, default: 0 },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for performance
challengeAttemptSchema.index({ userId: 1, challengeId: 1 });

// Models
const DailyChallenge = mongoose.model("DailyChallenge", dailyChallengeSchema);
const ChallengeAttempt = mongoose.model(
  "ChallengeAttempt",
  challengeAttemptSchema
);

module.exports = { DailyChallenge, ChallengeAttempt };
