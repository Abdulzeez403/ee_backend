// const express = require("express")
// const Reward = require("../models/Reward")
// const User = require("../models/User")
// const Transaction = require("../models/Transaction")
// const { authenticateToken, requireModerator } = require("../middleware/auth")
// const { paginate, generatePaymentReference } = require("../utils/helpers")

// const router = express.Router()

// // Get all available rewards
// router.get("/", async (req, res) => {
//   try {
//     const { page = 1, limit = 20, type, provider, category, minLevel } = req.query
//     const { skip, limit: limitNum } = paginate(page, limit)

//     const filter = { isActive: true }
//     if (type) filter.type = type
//     if (provider) filter.provider = provider
//     if (category) filter.category = category
//     if (minLevel) filter.minimumLevel = { $lte: Number.parseInt(minLevel) }

//     const rewards = await Reward.find(filter).sort({ coinCost: 1 }).skip(skip).limit(limitNum)

//     const total = await Reward.countDocuments(filter)

//     res.json({
//       rewards,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("Get rewards error:", error)
//     res.status(500).json({ message: "Failed to get rewards" })
//   }
// })

// // Get reward by ID
// router.get("/:id", async (req, res) => {
//   try {
//     const reward = await Reward.findById(req.params.id)

//     if (!reward || !reward.isActive) {
//       return res.status(404).json({ message: "Reward not found" })
//     }

//     res.json({ reward })
//   } catch (error) {
//     console.error("Get reward error:", error)
//     res.status(500).json({ message: "Failed to get reward" })
//   }
// })

// // Redeem reward
// router.post("/:id/redeem", authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params
//     const { phoneNumber, additionalInfo } = req.body
//     const userId = req.user._id

//     const reward = await Reward.findById(id)
//     if (!reward || !reward.isActive) {
//       return res.status(404).json({ message: "Reward not found" })
//     }

//     const user = await User.findById(userId)

//     // Check if reward is available
//     if (!reward.isAvailable()) {
//       return res.status(400).json({ message: "Reward is not available" })
//     }

//     // Check user level requirement
//     if (user.level < reward.minimumLevel) {
//       return res.status(400).json({
//         message: `You need to be level ${reward.minimumLevel} to redeem this reward`,
//       })
//     }

//     // Check if user has enough coins
//     if (user.coins < reward.coinCost) {
//       return res.status(400).json({
//         message: "Insufficient coins",
//         required: reward.coinCost,
//         available: user.coins,
//       })
//     }

//     // For airtime/data rewards, phone number is required
//     if (["airtime", "data"].includes(reward.type) && !phoneNumber) {
//       return res.status(400).json({ message: "Phone number is required for this reward" })
//     }

//     // Create transaction
//     const transaction = new Transaction({
//       user: userId,
//       type: "reward_redemption",
//       amount: 0,
//       coins: -reward.coinCost,
//       description: `Redeemed: ${reward.name}`,
//       status: "pending",
//       reward: reward._id,
//       metadata: {
//         phoneNumber,
//         additionalInfo,
//         rewardType: reward.type,
//         rewardValue: reward.value,
//         provider: reward.provider,
//       },
//     })

//     await transaction.save()

//     // Deduct coins from user
//     await user.spendCoins(reward.coinCost)

//     // Update reward stock and redemption count
//     await reward.redeem()

//     // Process the reward based on type
//     let processingResult
//     try {
//       processingResult = await processRewardRedemption(reward, transaction, phoneNumber)

//       if (processingResult.success) {
//         await transaction.complete(processingResult.metadata)
//       } else {
//         await transaction.fail(processingResult.error)
//         // Refund coins if processing failed
//         await user.addCoins(reward.coinCost)
//         // Restore reward stock
//         if (reward.stock > 0) {
//           reward.stock += 1
//           reward.redemptionCount -= 1
//           await reward.save()
//         }
//       }
//     } catch (processingError) {
//       console.error("Reward processing error:", processingError)
//       await transaction.fail(processingError.message)
//       // Refund coins
//       await user.addCoins(reward.coinCost)
//       // Restore reward stock
//       if (reward.stock > 0) {
//         reward.stock += 1
//         reward.redemptionCount -= 1
//         await reward.save()
//       }
//     }

//     await transaction.populate("reward", "name type value provider")

//     res.json({
//       message: "Reward redemption initiated",
//       transaction,
//       processingResult,
//     })
//   } catch (error) {
//     console.error("Redeem reward error:", error)
//     res.status(500).json({ message: "Failed to redeem reward" })
//   }
// })

// // Process reward redemption based on type
// async function processRewardRedemption(reward, transaction, phoneNumber) {
//   try {
//     switch (reward.type) {
//       case "airtime":
//       case "data":
//         // This would integrate with VTU API
//         // For now, we'll simulate the process
//         return {
//           success: true,
//           metadata: {
//             status: "processing",
//             reference: generatePaymentReference("VTU"),
//             phoneNumber,
//             provider: reward.provider,
//             value: reward.value,
//           },
//         }

//       case "voucher":
//         // Generate voucher code
//         const voucherCode = generateVoucherCode()
//         return {
//           success: true,
//           metadata: {
//             voucherCode,
//             expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
//           },
//         }

//       case "badge":
//         // Add badge to user achievements
//         const user = await User.findById(transaction.user)
//         user.achievements.push({
//           name: reward.name,
//           description: reward.description,
//           icon: reward.image,
//           earnedAt: new Date(),
//         })
//         await user.save()

//         return {
//           success: true,
//           metadata: {
//             badgeAwarded: true,
//             badgeName: reward.name,
//           },
//         }

//       case "premium":
//         // Upgrade user to premium (would need premium system)
//         return {
//           success: true,
//           metadata: {
//             premiumUpgrade: true,
//             duration: reward.value,
//           },
//         }

//       default:
//         return {
//           success: false,
//           error: "Unknown reward type",
//         }
//     }
//   } catch (error) {
//     return {
//       success: false,
//       error: error.message,
//     }
//   }
// }

// // Generate voucher code
// function generateVoucherCode() {
//   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
//   let result = ""
//   for (let i = 0; i < 12; i++) {
//     result += chars.charAt(Math.floor(Math.random() * chars.length))
//   }
//   return result
// }

// // Get user's redemption history
// router.get("/user/history", authenticateToken, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status, type } = req.query
//     const { skip, limit: limitNum } = paginate(page, limit)
//     const userId = req.user._id

//     const filter = {
//       user: userId,
//       type: "reward_redemption",
//     }
//     if (status) filter.status = status

//     const transactions = await Transaction.find(filter)
//       .populate("reward", "name type value provider image")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum)

//     const total = await Transaction.countDocuments(filter)

//     res.json({
//       redemptions: transactions,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("Get redemption history error:", error)
//     res.status(500).json({ message: "Failed to get redemption history" })
//   }
// })

// // Get reward categories and providers
// router.get("/meta/options", async (req, res) => {
//   try {
//     const types = await Reward.distinct("type", { isActive: true })
//     const providers = await Reward.distinct("provider", { isActive: true })
//     const categories = await Reward.distinct("category", { isActive: true })

//     res.json({
//       types: types.sort(),
//       providers: providers.sort(),
//       categories: categories.sort(),
//     })
//   } catch (error) {
//     console.error("Get reward options error:", error)
//     res.status(500).json({ message: "Failed to get reward options" })
//   }
// })

// // Admin: Create new reward
// router.post("/", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const rewardData = req.body

//     const reward = new Reward(rewardData)
//     await reward.save()

//     res.status(201).json({
//       message: "Reward created successfully",
//       reward,
//     })
//   } catch (error) {
//     console.error("Create reward error:", error)
//     res.status(500).json({ message: "Failed to create reward" })
//   }
// })

// // Admin: Update reward
// router.put("/:id", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const { id } = req.params
//     const updates = req.body

//     const reward = await Reward.findById(id)
//     if (!reward) {
//       return res.status(404).json({ message: "Reward not found" })
//     }

//     Object.keys(updates).forEach((key) => {
//       if (updates[key] !== undefined) {
//         reward[key] = updates[key]
//       }
//     })

//     await reward.save()

//     res.json({
//       message: "Reward updated successfully",
//       reward,
//     })
//   } catch (error) {
//     console.error("Update reward error:", error)
//     res.status(500).json({ message: "Failed to update reward" })
//   }
// })

// // Admin: Delete reward (soft delete)
// router.delete("/:id", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const reward = await Reward.findById(req.params.id)
//     if (!reward) {
//       return res.status(404).json({ message: "Reward not found" })
//     }

//     reward.isActive = false
//     await reward.save()

//     res.json({ message: "Reward deleted successfully" })
//   } catch (error) {
//     console.error("Delete reward error:", error)
//     res.status(500).json({ message: "Failed to delete reward" })
//   }
// })

// // Admin: Get reward statistics
// router.get("/:id/stats", authenticateToken, requireModerator, async (req, res) => {
//   try {
//     const { id } = req.params
//     const reward = await Reward.findById(id)

//     if (!reward) {
//       return res.status(404).json({ message: "Reward not found" })
//     }

//     // Get redemption statistics
//     const redemptionStats = await Transaction.aggregate([
//       {
//         $match: {
//           reward: reward._id,
//           type: "reward_redemption",
//         },
//       },
//       {
//         $group: {
//           _id: "$status",
//           count: { $sum: 1 },
//           totalCoins: { $sum: { $abs: "$coins" } },
//         },
//       },
//     ])

//     // Get recent redemptions
//     const recentRedemptions = await Transaction.find({
//       reward: reward._id,
//       type: "reward_redemption",
//     })
//       .populate("user", "username firstName lastName")
//       .sort({ createdAt: -1 })
//       .limit(10)

//     res.json({
//       reward: {
//         name: reward.name,
//         type: reward.type,
//         coinCost: reward.coinCost,
//         redemptionCount: reward.redemptionCount,
//         stock: reward.stock,
//         isActive: reward.isActive,
//       },
//       stats: redemptionStats,
//       recentRedemptions,
//     })
//   } catch (error) {
//     console.error("Get reward stats error:", error)
//     res.status(500).json({ message: "Failed to get reward statistics" })
//   }
// })

// module.exports = router
