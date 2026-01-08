const User = require("../models/userModel");
const UserProfile = require("../models/userProfileModel");

const Quiz = require("../models/quizModel");

// CREATE a quiz
const createQuiz = async (req, res) => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// READ all quizzes personalized to the user
const getQuizzes = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's profile
    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // Filter quizzes using user's subjects + exams
    // const quizzes = await Quiz.find({
    //   // exam: { $in: user.exams }, // <-- correct source
    //   subject: { $in: user.subjects }, // <-- correct source
    // });

    const quizzes = await Quiz.find();

    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// READ one quiz
const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).select("-correctAnswer");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE a quiz
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE a quiz
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
};
