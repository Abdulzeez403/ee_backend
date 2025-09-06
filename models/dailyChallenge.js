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
    type: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    exam: { type: String, required: true, trim: true },
    timeLimit: { type: Number, default: 600 }, // seconds
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    questions: [questionSchema],
  },
  { timestamps: true }
);

const DailyChallenge = mongoose.model("DailyChallenge", dailyChallengeSchema);

module.exports = { DailyChallenge };
