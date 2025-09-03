// routes/quizRoutes.js
const express = require("express");
const {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
} = require("../controllers/quiz");

const router = express.Router();

router.post("/", createQuiz); // Create quiz
router.get("/", getQuizzes); // Get all quizzes
router.get("/:id", getQuiz); // Get single quiz
router.put("/:id", updateQuiz); // Update quiz
router.delete("/:id", deleteQuiz); // Delete quiz

module.exports = router;
