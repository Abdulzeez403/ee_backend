const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { purchaseAirtime } = require("../controllers/vtu/airtime");
const { purchaseData } = require("../controllers/vtu/dataBundle");
const { purchaseExamPin } = require("../controllers/vtu/exam");
router.post("/airtime", authenticateToken, purchaseAirtime);
router.post("/data", authenticateToken, purchaseData);
router.post("/exam-pin", authenticateToken, purchaseExamPin);

module.exports = router;
