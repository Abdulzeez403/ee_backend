const express = require("express");
const { addCoins, deductCoins } = require("../controllers/coinController");

const router = express.Router();
const { authenticateToken } = require("../middleware/auth");

// Coin operations
router.post("/:id/add", authenticateToken, addCoins);
router.post("/:id/deduct", authenticateToken, deductCoins);
module.exports = router;
