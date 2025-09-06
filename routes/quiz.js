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
const { authenticateToken } = require("../middleware/auth");

router.post("/", authenticateToken, createQuiz); // Create quiz
router.get("/", authenticateToken, getQuizzes); // Get all quizzes
router.get("/:id", authenticateToken, getQuiz); // Get single quiz
router.put("/:id", authenticateToken, updateQuiz); // Update quiz
router.delete("/:id", authenticateToken, deleteQuiz); // Delete quiz

module.exports = router;
