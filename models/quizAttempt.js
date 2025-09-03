const mongoose = require("mongoose");

const userQuizAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  date: { type: Date, default: Date.now }, // attempt date
});

module.exports = mongoose.model("UserQuizAttempt", userQuizAttemptSchema);
