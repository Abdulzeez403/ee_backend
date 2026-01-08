const { generateTokens } = require("../utils/helpers");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const UserProfile = require("../models/userProfileModel");

const getCookieValue = (req, cookieName) => {
  const raw = req.headers?.cookie;
  if (!raw) return null;
  const parts = raw.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${cookieName}=`));
  if (!match) return null;
  const value = match.substring(cookieName.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const sanitizeUser = (userDoc) => {
  const obj = userDoc?.toObject ? userDoc.toObject() : { ...(userDoc || {}) };
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

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

    // 1️⃣ Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // 2️⃣ Create the User (auth only)
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: "user",
      exams,
      subjects,
    });

    // 3️⃣ Create the linked UserProfile
    const userProfile = await UserProfile.create({
      userId: user._id,
      fullName: `${firstName} ${lastName}`,
      email,
      avatar: "/default-avatar.png",
      stats: {
        level: 1,
        xp: 0,
        coins: user.coins,
        quizzesCompleted: 0,
        averageScore: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      exams,
      subjects: subjects.map((sub) => ({
        name: sub,
        quizzesCompleted: 0,
        averageScore: 0,
        totalScore: 0,
        totalAttempts: 0,
      })),
      achievements: [],
      activityLog: [],
    });

    // 4️⃣ Generate access & refresh tokens
    const { accessToken, refreshToken } = generateTokens(user._id, res);

    // 5️⃣ Save refresh token in User
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
    });
    await user.save();

    // 6️⃣ Send response with both user and profile
    return res.status(201).json({
      message: "User registered successfully",
      user: sanitizeUser(user),
      profile: userProfile,
      accessToken,
    });
  } catch (err) {
    console.error(err);
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
    const { accessToken, refreshToken } = generateTokens(user._id, res);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
    });
    await user.save();

    let profile = await UserProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = await UserProfile.create({
        userId: user._id,
        fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.email,
        avatar: "/default-avatar.png",
        exams: user.exams || [],
        stats: {
          level: 1,
          xp: 0,
          coins: user.coins || 0,
          quizzesCompleted: 0,
          averageScore: 0,
          currentStreak: 0,
          longestStreak: 0,
        },
        subjects: (user.subjects || []).map((sub) => ({
          name: sub,
          quizzesCompleted: 0,
          averageScore: 0,
          totalScore: 0,
          totalAttempts: 0,
        })),
        achievements: [],
        activityLog: [],
      });
    }

    return res.json({
      accessToken,
      user: sanitizeUser(user),
      profile,
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
    const refreshToken =
      getCookieValue(req, "refreshToken") || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, refreshSecret);
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

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id,
      res
    );

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
    user.refreshTokens = user.refreshTokens
      .filter((rt) => rt.token !== refreshToken)
      .concat([{ token: newRefreshToken, expiresAt: refreshTokenExpiry }]);
    await user.save();

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
    const refreshToken =
      req.body?.refreshToken || getCookieValue(req, "refreshToken");
    const user = await User.findById(req.user._id);
    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== refreshToken
      );
      await user.save();
    }
    res.clearCookie("refreshToken", { path: "/" });
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
    const userId = req.user._id;
    const profile = await UserProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "User profile not found" });

    const today = new Date();
    const lastQuizDate = profile.lastQuizDate;

    if (!lastQuizDate) {
      profile.stats.currentStreak = 1;
    } else {
      const daysDiff = Math.floor(
        (today - lastQuizDate) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) profile.stats.currentStreak += 1;
      else if (daysDiff > 1) profile.stats.currentStreak = 1;
    }

    profile.stats.longestStreak = Math.max(
      profile.stats.longestStreak || 0,
      profile.stats.currentStreak || 0
    );
    profile.lastQuizDate = today;
    await profile.save();

    await User.findByIdAndUpdate(userId, {
      $set: { streak: profile.stats.currentStreak, lastQuizDate: today },
    });

    return res.json({
      currentStreak: profile.stats.currentStreak,
      longestStreak: profile.stats.longestStreak,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to update streak", error: err.message });
  }
};

// Get Profile
const getProfile = async (req, res) => {
  try {
    // 1️⃣ Find the User first (optional: auth verification)
    const user = await User.findById(req.user._id).select(
      "-password -refreshTokens"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Find the linked UserProfile
    const profile = await UserProfile.findOne({ userId: user._id });
    if (!profile)
      return res.status(404).json({ message: "User profile not found" });

    // 3️⃣ Return both user info and profile
    return res.json({
      user,
      profile,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to get profile", error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // 1️⃣ Get all users (excluding sensitive fields)
    const users = await User.find().select("-password -refreshTokens");

    // 2️⃣ Get profiles for all users
    const profiles = await UserProfile.find({
      userId: { $in: users.map((u) => u._id) },
    });

    // 3️⃣ Merge user + profile for frontend consumption
    const result = users.map((user) => {
      const profile = profiles.find(
        (p) => p.userId.toString() === user._id.toString()
      );
      return {
        ...user.toObject(),
        profile: profile || null,
      };
    });

    return res.status(200).json({ users: result });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to fetch users", error: err.message });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, avatar, preferences, exams, subjects } =
      req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    if (Array.isArray(exams)) user.exams = exams;
    if (Array.isArray(subjects)) user.subjects = subjects;

    await user.save();

    const profile = await UserProfile.findOne({ userId: user._id });
    if (profile) {
      if (avatar) profile.avatar = avatar;
      profile.fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      profile.email = user.email;
      if (Array.isArray(exams)) profile.exams = exams;
      if (Array.isArray(subjects)) {
        const existingByName = new Map(
          (profile.subjects || []).map((s) => [s.name, s])
        );
        profile.subjects = subjects.map((name) => {
          const existing = existingByName.get(name);
          return (
            existing || {
              name,
              quizzesCompleted: 0,
              averageScore: 0,
              totalScore: 0,
              totalAttempts: 0,
            }
          );
        });
      }
      await profile.save();
    }

    return res.json({
      message: "Profile updated successfully",
      user: sanitizeUser(user),
      profile,
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
  getAllUsers,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyEmail,
};
