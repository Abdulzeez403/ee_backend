const express = require("express");
const submitQuiz = require("../businessLogic/submit_quiz");
const checkAttempt = require("../businessLogic/check_attempt");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");

router.post("/:userId/submit-quiz", authenticateToken, submitQuiz);
router.get("/check/:type/:id", authenticateToken, checkAttempt);

module.exports = router;
