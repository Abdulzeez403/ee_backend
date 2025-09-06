const {
  DailyChallenge,
  ChallengeAttempt,
} = require("../models/dailyChallenge");

// Create
const createChallenge = async (req, res) => {
  try {
    const challenge = new DailyChallenge(req.body);
    await challenge.save();
    res.status(201).json(challenge);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create challenge", error: err.message });
  }
};

// Read all
const getChallenges = async (req, res) => {
  try {
    const challenges = await DailyChallenge.find().sort({ createdAt: -1 });
    res.json(challenges);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch challenges", error: err.message });
  }
};

// Read one
const getChallengeById = async (req, res) => {
  try {
    const challenge = await DailyChallenge.findById(req.params.id);
    if (!challenge)
      return res.status(404).json({ message: "Challenge not found" });
    res.json(challenge);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch challenge", error: err.message });
  }
};

// Update
const updateChallenge = async (req, res) => {
  try {
    const challenge = await DailyChallenge.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!challenge)
      return res.status(404).json({ message: "Challenge not found" });
    res.json(challenge);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update challenge", error: err.message });
  }
};

// Delete
const deleteChallenge = async (req, res) => {
  try {
    const challenge = await DailyChallenge.findByIdAndDelete(req.params.id);
    if (!challenge)
      return res.status(404).json({ message: "Challenge not found" });
    res.json({ message: "Challenge deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete challenge", error: err.message });
  }
};

const getActiveChallenge = async (req, res) => {
  try {
    const now = new Date();
    const challenge = await DailyChallenge.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    });

    if (!challenge) {
      return res.status(404).json({ message: "No active challenge found" });
    }

    res.json(challenge);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch active challenge",
      error: err.message,
    });
  }
};

module.exports = {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  getActiveChallenge,
};
