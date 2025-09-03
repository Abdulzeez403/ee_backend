const express = require("express");
const submitQuiz = require("../businessLogic/submit_quiz");
const quizAttempt = require("../businessLogic/quiz_attempt");
const challengeLogic = require("../businessLogic/challenge_logic");

const router = express.Router();
const { authenticateToken } = require("../middleware/auth");

router.post("/:id/submit-quiz", authenticateToken, submitQuiz);
router.post("/:id/quiz-attempt", authenticateToken, quizAttempt);
router.post("/complete", authenticateToken, challengeLogic);

module.exports = router;
