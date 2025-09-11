const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const connectDB = require("./config/database");
const app = express();
require("dotenv").config();
const authRoutes = require("./routes/auth");
const coinRoutes = require("./routes/coin");
const quizRoutes = require("./routes/quiz");
const businessLogicRoutes = require("./routes/businessLogic");
const dailyChallengeRoutes = require("./routes/dailyChallenge");
const rewardRoutes = require("./routes/reward");

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://passrite.vercel.app"],
    credentials: true,
  })
);

// // // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan("combined"));

// Database connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/coin", coinRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/logic", businessLogicRoutes);
app.use("/api/daily-challenges", dailyChallengeRoutes);
app.use("/api/purchase", rewardRoutes);

// ✅ Healthcheck route to prevent cold start
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
