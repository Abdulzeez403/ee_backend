const express = require("express");
const {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  getActiveChallenge,
} = require("../controllers/dailyChallenge");

const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, createChallenge); // Create
router.get("/", authenticateToken, getChallenges); // Get all
router.get("/:id", authenticateToken, getChallengeById); // Get one
router.put("/:id", authenticateToken, updateChallenge); // Update
router.delete("/:id", authenticateToken, deleteChallenge); // Delete
router.get("/status/active", authenticateToken, getActiveChallenge); // Get one

module.exports = router;
