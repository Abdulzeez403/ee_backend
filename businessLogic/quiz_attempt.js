const UserQuizAttempt = require("../models/quizAttempt");

const attemptQuiz = async (req, res) => {
  try {
    const { userId, quizId } = req.body;

    // Get start and end of today
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    // Check if the user has already attempted today
    const attempt = await UserQuizAttempt.findOne({
      userId,
      quizId,
      date: { $gte: startOfDay, $lt: endOfDay },
    });

    if (attempt) {
      return res
        .status(400)
        .json({ message: "You have already attempted today's quiz." });
    }

    // If not attempted, create a new attempt record
    const newAttempt = new UserQuizAttempt({
      userId,
      quizId,
      date: new Date(),
    });

    await newAttempt.save();

    return res.status(201).json({
      message: "Quiz attempt recorded successfully.",
      attempt: newAttempt,
    });
  } catch (error) {
    console.error("Error in attemptQuiz:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = attemptQuiz;
