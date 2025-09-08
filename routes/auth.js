const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshAccessToken,
  logout,
  updateStreak,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyEmail,
} = require("../controllers/auth");
const { authenticateToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", authenticateToken, logout);

router.get("/me", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.put("/change-password", authenticateToken, changePassword);

router.post("/forgot-password", forgotPassword);
router.post("/verify-email", verifyEmail);

module.exports = router;
