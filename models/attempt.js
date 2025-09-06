// models/attempt.js
const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // quizId or challengeId
    },
    type: {
      type: String,
      enum: ["quiz", "challenge"],
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate attempts for the same user, reference, and type
attemptSchema.index({ userId: 1, referenceId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Attempt", attemptSchema);
