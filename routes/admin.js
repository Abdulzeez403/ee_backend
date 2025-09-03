// const express = require("express");
// const router = express.Router();
// const adminController = require("../controllers/adminController");
// const auth = require("../middleware/auth");
// const { body } = require("express-validator");

// // Admin middleware
// const adminAuth = (req, res, next) => {
//   if (req.user.role !== "admin") {
//     return res.status(403).json({
//       success: false,
//       message: "Access denied. Admin privileges required.",
//     });
//   }
//   next();
// };

// // Dashboard analytics
// router.get(
//   "/dashboard",
//   auth,
//   adminAuth,
//   adminController.getDashboardAnalytics
// );

// // User management
// router.get("/users", auth, adminAuth, adminController.getAllUsers);
// router.get("/users/:userId", auth, adminAuth, adminController.getUserDetails);
// router.put(
//   "/users/:userId/status",
//   auth,
//   adminAuth,
//   adminController.updateUserStatus
// );
// router.delete("/users/:userId", auth, adminAuth, adminController.deleteUser);

// // Question management
// router.get("/questions", auth, adminAuth, adminController.getAllQuestions);
// router.post(
//   "/questions",
//   auth,
//   adminAuth,
//   [
//     body("question").notEmpty().withMessage("Question is required"),
//     body("options")
//       .isArray({ min: 2 })
//       .withMessage("At least 2 options required"),
//     body("correctAnswer").notEmpty().withMessage("Correct answer is required"),
//     body("subject").notEmpty().withMessage("Subject is required"),
//     body("difficulty")
//       .isIn(["easy", "medium", "hard"])
//       .withMessage("Valid difficulty required"),
//   ],
//   adminController.createQuestion
// );
// router.put(
//   "/questions/:questionId",
//   auth,
//   adminAuth,
//   adminController.updateQuestion
// );
// router.delete(
//   "/questions/:questionId",
//   auth,
//   adminAuth,
//   adminController.deleteQuestion
// );

// // Quiz management
// router.get("/quizzes", auth, adminAuth, adminController.getAllQuizzes);
// router.get(
//   "/quiz-analytics",
//   auth,
//   adminAuth,
//   adminController.getQuizAnalytics
// );

// // Transaction management
// router.get(
//   "/transactions",
//   auth,
//   adminAuth,
//   adminController.getAllTransactions
// );
// router.get(
//   "/transaction-analytics",
//   auth,
//   adminAuth,
//   adminController.getTransactionAnalytics
// );

// // Reward management
// router.get("/rewards", auth, adminAuth, adminController.getAllRewards);
// router.post("/rewards", auth, adminAuth, adminController.createReward);
// router.put("/rewards/:rewardId", auth, adminAuth, adminController.updateReward);
// router.delete(
//   "/rewards/:rewardId",
//   auth,
//   adminAuth,
//   adminController.deleteReward
// );

// // System settings
// router.get("/settings", auth, adminAuth, adminController.getSystemSettings);
// router.put("/settings", auth, adminAuth, adminController.updateSystemSettings);

// // Reports
// router.get("/reports/users", auth, adminAuth, adminController.getUserReport);
// router.get(
//   "/reports/performance",
//   auth,
//   adminAuth,
//   adminController.getPerformanceReport
// );
// router.get(
//   "/reports/revenue",
//   auth,
//   adminAuth,
//   adminController.getRevenueReport
// );

// module.exports = router;
