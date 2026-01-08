const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const {
  initializeMembershipPayment,
  verifyMembershipPayment,
  membershipStatus,
  paystackWebhook,
} = require("../controllers/subscription");

router.get("/status", authenticateToken, membershipStatus);
router.post("/initialize", authenticateToken, initializeMembershipPayment);
router.get("/verify/:reference", authenticateToken, verifyMembershipPayment);
router.post("/webhook", paystackWebhook);

module.exports = router;

