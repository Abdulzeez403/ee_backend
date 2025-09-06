// ✅ Check if user already attempted a quiz or challenge
const mongoose = require("mongoose");
const Attempt = require("../models/attempt");

const checkAttempt = async (req, res) => {
  try {
    const { id, type } = req.params; // id = quizId or challengeId
    const userId = req.user.id; // assuming you attach user to req.user from auth middleware

    if (!["quiz", "challenge"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const attempt = await Attempt.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      referenceId: new mongoose.Types.ObjectId(id),
      type,
    });

    res.json({ attempted: !!attempt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = checkAttempt;
