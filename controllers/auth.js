const { generateTokens } = require("../utils/helpers");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");

// =====================
// Auth Controller
// =====================

// Register
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      exams = [],
      subjects = [],
    } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      exams,
      subjects,
    });
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
    });
    await user.save();

    return res.status(201).json({
      user: user,
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate tokens
    const { accessToken } = generateTokens(user._id);
    await user.save();
    return res.json({
      // user,
      accessToken,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Login failed!!", error: err.message });
  }
};

// Refresh Token

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // check refreshToken in DB
    const tokenExists = user.refreshTokens.some(
      (rt) => rt.token === refreshToken && rt.expiresAt > new Date()
    );
    if (!tokenExists) {
      return res
        .status(403)
        .json({ message: "Invalid or expired refresh token" });
    }

    // issue new access token + rotate refresh token
    const { accessToken } = generateTokens(user._id, res);

    return res.json({ accessToken });
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token refresh failed", error: err.message });
  }
};

// const refreshAccessToken = async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;
//     if (!refreshToken)
//       return res.status(401).json({ message: "No refresh token" });

//     const user = await User.findOne({ "refreshTokens.token": refreshToken });
//     if (!user)
//       return res.status(401).json({ message: "Invalid refresh token" });

//     // Verify refresh token (JWT.verify)
//     jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

//     const { accessToken } = generateTokens(user._id);

//     return res.json({ accessToken });
//   } catch (err) {
//     return res.status(401).json({ message: "Token refresh failed" });
//   }
// };

// Logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id);
    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== refreshToken
      );
      await user.save();
    }
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Logout failed", error: err.message });
  }
};

// Update Streak
const updateStreak = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const today = new Date();
    const lastQuizDate = user.lastQuizDate;

    if (!lastQuizDate) {
      user.streak = 1;
    } else {
      const daysDiff = Math.floor(
        (today - lastQuizDate) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) user.streak += 1;
      else if (daysDiff > 1) user.streak = 1;
    }

    user.lastQuizDate = today;
    await user.save();
    return res.json({ streak: user.streak });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to update streak", error: err.message });
  }
};

// Get Profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -refreshTokens"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to get profile", error: err.message });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, avatar, preferences } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (avatar) user.avatar = avatar;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;

    return res.json({
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Profile update failed", error: err.message });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res
        .status(400)
        .json({ message: "Current and new password required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password too short" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid)
      return res.status(400).json({ message: "Current password incorrect" });

    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    return res.json({
      message: "Password changed successfully. Please login again.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Password change failed", error: err.message });
  }
};

// Forgot Password (placeholder)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    // TODO: send reset email
    return res.json({
      message: "If the email exists, a reset link has been sent",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to process forgot password",
      error: err.message,
    });
  }
};

// Verify Email (placeholder)
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res
        .status(400)
        .json({ message: "Verification token is required" });

    // TODO: Implement verification
    return res.json({ message: "Email verification feature coming soon" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Email verification failed", error: err.message });
  }
};

module.exports = {
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
};
