// const express = require("express")
// const axios = require("axios")
// const crypto = require("crypto")
// const User = require("../models/User")
// const Transaction = require("../models/Transaction")
// const { authenticateToken } = require("../middleware/auth")
// const { generatePaymentReference, paginate } = require("../utils/helpers")

// const router = express.Router()

// // Get coin packages
// router.get("/packages", async (req, res) => {
//   try {
//     const packages = [
//       {
//         id: "basic",
//         name: "Basic Package",
//         coins: 100,
//         price: 500, // 500 naira
//         bonus: 0,
//         popular: false,
//       },
//       {
//         id: "standard",
//         name: "Standard Package",
//         coins: 250,
//         price: 1000,
//         bonus: 25, // 10% bonus
//         popular: true,
//       },
//       {
//         id: "premium",
//         name: "Premium Package",
//         coins: 500,
//         price: 2000,
//         bonus: 75, // 15% bonus
//         popular: false,
//       },
//       {
//         id: "mega",
//         name: "Mega Package",
//         coins: 1000,
//         price: 3500,
//         bonus: 200, // 20% bonus
//         popular: false,
//       },
//       {
//         id: "ultimate",
//         name: "Ultimate Package",
//         coins: 2500,
//         price: 8000,
//         bonus: 625, // 25% bonus
//         popular: false,
//       },
//     ]

//     res.json({ packages })
//   } catch (error) {
//     console.error("Get packages error:", error)
//     res.status(500).json({ message: "Failed to get coin packages" })
//   }
// })

// // Initialize Paystack payment
// router.post("/paystack/initialize", authenticateToken, async (req, res) => {
//   try {
//     const { packageId, email } = req.body
//     const userId = req.user._id

//     // Get package details
//     const packages = {
//       basic: { coins: 100, price: 500, bonus: 0 },
//       standard: { coins: 250, price: 1000, bonus: 25 },
//       premium: { coins: 500, price: 2000, bonus: 75 },
//       mega: { coins: 1000, price: 3500, bonus: 200 },
//       ultimate: { coins: 2500, price: 8000, bonus: 625 },
//     }

//     const selectedPackage = packages[packageId]
//     if (!selectedPackage) {
//       return res.status(400).json({ message: "Invalid package selected" })
//     }

//     const reference = generatePaymentReference("PS")
//     const amount = selectedPackage.price * 100 // Convert to kobo

//     // Create transaction record
//     const transaction = new Transaction({
//       user: userId,
//       type: "coin_purchase",
//       amount: selectedPackage.price,
//       coins: selectedPackage.coins + selectedPackage.bonus,
//       description: `Coin purchase: ${packageId} package`,
//       status: "pending",
//       paymentGateway: "paystack",
//       paymentReference: reference,
//       metadata: {
//         packageId,
//         baseCoins: selectedPackage.coins,
//         bonusCoins: selectedPackage.bonus,
//         email,
//       },
//     })

//     await transaction.save()

//     // Initialize Paystack payment
//     const paystackResponse = await axios.post(
//       "https://api.paystack.co/transaction/initialize",
//       {
//         email,
//         amount,
//         reference,
//         callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
//         metadata: {
//           userId: userId.toString(),
//           transactionId: transaction._id.toString(),
//           packageId,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       },
//     )

//     if (paystackResponse.data.status) {
//       res.json({
//         message: "Payment initialized successfully",
//         data: {
//           authorization_url: paystackResponse.data.data.authorization_url,
//           access_code: paystackResponse.data.data.access_code,
//           reference,
//           transaction: transaction._id,
//         },
//       })
//     } else {
//       await transaction.fail("Payment initialization failed")
//       res.status(400).json({ message: "Failed to initialize payment" })
//     }
//   } catch (error) {
//     console.error("Paystack initialize error:", error)
//     res.status(500).json({ message: "Payment initialization failed" })
//   }
// })

// // Initialize Flutterwave payment
// router.post("/flutterwave/initialize", authenticateToken, async (req, res) => {
//   try {
//     const { packageId, email, phoneNumber } = req.body
//     const userId = req.user._id

//     // Get package details
//     const packages = {
//       basic: { coins: 100, price: 500, bonus: 0 },
//       standard: { coins: 250, price: 1000, bonus: 25 },
//       premium: { coins: 500, price: 2000, bonus: 75 },
//       mega: { coins: 1000, price: 3500, bonus: 200 },
//       ultimate: { coins: 2500, price: 8000, bonus: 625 },
//     }

//     const selectedPackage = packages[packageId]
//     if (!selectedPackage) {
//       return res.status(400).json({ message: "Invalid package selected" })
//     }

//     const reference = generatePaymentReference("FW")

//     // Create transaction record
//     const transaction = new Transaction({
//       user: userId,
//       type: "coin_purchase",
//       amount: selectedPackage.price,
//       coins: selectedPackage.coins + selectedPackage.bonus,
//       description: `Coin purchase: ${packageId} package`,
//       status: "pending",
//       paymentGateway: "flutterwave",
//       paymentReference: reference,
//       metadata: {
//         packageId,
//         baseCoins: selectedPackage.coins,
//         bonusCoins: selectedPackage.bonus,
//         email,
//         phoneNumber,
//       },
//     })

//     await transaction.save()

//     // Initialize Flutterwave payment
//     const flutterwaveResponse = await axios.post(
//       "https://api.flutterwave.com/v3/payments",
//       {
//         tx_ref: reference,
//         amount: selectedPackage.price,
//         currency: "NGN",
//         redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
//         customer: {
//           email,
//           phone_number: phoneNumber,
//           name: `${req.user.firstName} ${req.user.lastName}`,
//         },
//         customizations: {
//           title: "ExamPrep+ Coin Purchase",
//           description: `Purchase ${selectedPackage.coins + selectedPackage.bonus} coins`,
//           logo: `${process.env.FRONTEND_URL}/logo.png`,
//         },
//         meta: {
//           userId: userId.toString(),
//           transactionId: transaction._id.toString(),
//           packageId,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       },
//     )

//     if (flutterwaveResponse.data.status === "success") {
//       res.json({
//         message: "Payment initialized successfully",
//         data: {
//           payment_link: flutterwaveResponse.data.data.link,
//           reference,
//           transaction: transaction._id,
//         },
//       })
//     } else {
//       await transaction.fail("Payment initialization failed")
//       res.status(400).json({ message: "Failed to initialize payment" })
//     }
//   } catch (error) {
//     console.error("Flutterwave initialize error:", error)
//     res.status(500).json({ message: "Payment initialization failed" })
//   }
// })

// // Paystack webhook
// router.post("/paystack/webhook", async (req, res) => {
//   try {
//     const hash = crypto
//       .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
//       .update(JSON.stringify(req.body))
//       .digest("hex")

//     if (hash !== req.headers["x-paystack-signature"]) {
//       return res.status(400).json({ message: "Invalid signature" })
//     }

//     const event = req.body

//     if (event.event === "charge.success") {
//       await processPaystackPayment(event.data)
//     }

//     res.status(200).json({ message: "Webhook processed" })
//   } catch (error) {
//     console.error("Paystack webhook error:", error)
//     res.status(500).json({ message: "Webhook processing failed" })
//   }
// })

// // Flutterwave webhook
// router.post("/flutterwave/webhook", async (req, res) => {
//   try {
//     const secretHash = process.env.FLUTTERWAVE_SECRET_HASH
//     const signature = req.headers["verif-hash"]

//     if (!signature || signature !== secretHash) {
//       return res.status(400).json({ message: "Invalid signature" })
//     }

//     const payload = req.body

//     if (payload.event === "charge.completed" && payload.data.status === "successful") {
//       await processFlutterwavePayment(payload.data)
//     }

//     res.status(200).json({ message: "Webhook processed" })
//   } catch (error) {
//     console.error("Flutterwave webhook error:", error)
//     res.status(500).json({ message: "Webhook processing failed" })
//   }
// })

// // Process Paystack payment
// async function processPaystackPayment(paymentData) {
//   try {
//     const reference = paymentData.reference
//     const transaction = await Transaction.findOne({
//       paymentReference: reference,
//       paymentGateway: "paystack",
//       status: "pending",
//     })

//     if (!transaction) {
//       console.error("Transaction not found for reference:", reference)
//       return
//     }

//     if (paymentData.status === "success") {
//       // Add coins to user
//       const user = await User.findById(transaction.user)
//       await user.addCoins(transaction.coins)

//       // Complete transaction
//       await transaction.complete({
//         paystackData: paymentData,
//         paidAt: new Date(),
//         gateway_response: paymentData.gateway_response,
//       })

//       console.log(`Payment successful for user ${user.username}: +${transaction.coins} coins`)
//     } else {
//       await transaction.fail(`Payment failed: ${paymentData.gateway_response}`)
//     }
//   } catch (error) {
//     console.error("Process Paystack payment error:", error)
//   }
// }

// // Process Flutterwave payment
// async function processFlutterwavePayment(paymentData) {
//   try {
//     const reference = paymentData.tx_ref
//     const transaction = await Transaction.findOne({
//       paymentReference: reference,
//       paymentGateway: "flutterwave",
//       status: "pending",
//     })

//     if (!transaction) {
//       console.error("Transaction not found for reference:", reference)
//       return
//     }

//     // Verify payment with Flutterwave
//     const verifyResponse = await axios.get(`https://api.flutterwave.com/v3/transactions/${paymentData.id}/verify`, {
//       headers: {
//         Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
//       },
//     })

//     if (verifyResponse.data.status === "success" && verifyResponse.data.data.status === "successful") {
//       // Add coins to user
//       const user = await User.findById(transaction.user)
//       await user.addCoins(transaction.coins)

//       // Complete transaction
//       await transaction.complete({
//         flutterwaveData: paymentData,
//         paidAt: new Date(),
//         processor_response: paymentData.processor_response,
//       })

//       console.log(`Payment successful for user ${user.username}: +${transaction.coins} coins`)
//     } else {
//       await transaction.fail(`Payment verification failed`)
//     }
//   } catch (error) {
//     console.error("Process Flutterwave payment error:", error)
//   }
// }

// // Verify payment status
// router.get("/verify/:reference", authenticateToken, async (req, res) => {
//   try {
//     const { reference } = req.params
//     const userId = req.user._id

//     const transaction = await Transaction.findOne({
//       paymentReference: reference,
//       user: userId,
//     })

//     if (!transaction) {
//       return res.status(404).json({ message: "Transaction not found" })
//     }

//     // If still pending, try to verify with payment gateway
//     if (transaction.status === "pending") {
//       let verificationResult = null

//       if (transaction.paymentGateway === "paystack") {
//         verificationResult = await verifyPaystackPayment(reference)
//       } else if (transaction.paymentGateway === "flutterwave") {
//         verificationResult = await verifyFlutterwavePayment(reference)
//       }

//       if (verificationResult && verificationResult.success) {
//         // Process the payment
//         const user = await User.findById(userId)
//         await user.addCoins(transaction.coins)
//         await transaction.complete(verificationResult.data)
//       }
//     }

//     res.json({
//       transaction: {
//         id: transaction._id,
//         reference: transaction.paymentReference,
//         status: transaction.status,
//         amount: transaction.amount,
//         coins: transaction.coins,
//         createdAt: transaction.createdAt,
//         processedAt: transaction.processedAt,
//       },
//     })
//   } catch (error) {
//     console.error("Verify payment error:", error)
//     res.status(500).json({ message: "Payment verification failed" })
//   }
// })

// // Verify Paystack payment
// async function verifyPaystackPayment(reference) {
//   try {
//     const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
//       headers: {
//         Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//       },
//     })

//     if (response.data.status && response.data.data.status === "success") {
//       return {
//         success: true,
//         data: {
//           paystackData: response.data.data,
//           paidAt: new Date(),
//           gateway_response: response.data.data.gateway_response,
//         },
//       }
//     }

//     return { success: false }
//   } catch (error) {
//     console.error("Verify Paystack payment error:", error)
//     return { success: false }
//   }
// }

// // Verify Flutterwave payment
// async function verifyFlutterwavePayment(reference) {
//   try {
//     // First get transaction by reference
//     const response = await axios.get(`https://api.flutterwave.com/v3/transactions?tx_ref=${reference}`, {
//       headers: {
//         Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
//       },
//     })

//     if (response.data.status === "success" && response.data.data.length > 0) {
//       const transaction = response.data.data[0]

//       if (transaction.status === "successful") {
//         return {
//           success: true,
//           data: {
//             flutterwaveData: transaction,
//             paidAt: new Date(),
//             processor_response: transaction.processor_response,
//           },
//         }
//       }
//     }

//     return { success: false }
//   } catch (error) {
//     console.error("Verify Flutterwave payment error:", error)
//     return { success: false }
//   }
// }

// // Get user's payment history
// router.get("/history", authenticateToken, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status } = req.query
//     const { skip, limit: limitNum } = paginate(page, limit)
//     const userId = req.user._id

//     const filter = {
//       user: userId,
//       type: "coin_purchase",
//     }
//     if (status) filter.status = status

//     const transactions = await Transaction.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .select("amount coins status paymentGateway paymentReference createdAt processedAt metadata")

//     const total = await Transaction.countDocuments(filter)

//     res.json({
//       transactions,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("Get payment history error:", error)
//     res.status(500).json({ message: "Failed to get payment history" })
//   }
// })

// // Get payment statistics (admin)
// router.get("/stats", authenticateToken, async (req, res) => {
//   try {
//     const { period = "monthly" } = req.query

//     // Check if user is admin
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Admin access required" })
//     }

//     const dateFilter = getDateFilter(period)

//     const stats = await Transaction.aggregate([
//       {
//         $match: {
//           type: "coin_purchase",
//           createdAt: dateFilter,
//         },
//       },
//       {
//         $group: {
//           _id: {
//             status: "$status",
//             gateway: "$paymentGateway",
//           },
//           count: { $sum: 1 },
//           totalAmount: { $sum: "$amount" },
//           totalCoins: { $sum: "$coins" },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.gateway",
//           statuses: {
//             $push: {
//               status: "$_id.status",
//               count: "$count",
//               totalAmount: "$totalAmount",
//               totalCoins: "$totalCoins",
//             },
//           },
//           totalTransactions: { $sum: "$count" },
//           totalRevenue: { $sum: "$totalAmount" },
//         },
//       },
//     ])

//     res.json({ stats })
//   } catch (error) {
//     console.error("Get payment stats error:", error)
//     res.status(500).json({ message: "Failed to get payment statistics" })
//   }
// })

// // Get date filter for period
// function getDateFilter(period) {
//   const now = new Date()
//   let startDate

//   switch (period) {
//     case "daily":
//       startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
//       break
//     case "weekly":
//       startDate = new Date(now.setDate(now.getDate() - 7))
//       break
//     case "monthly":
//       startDate = new Date(now.getFullYear(), now.getMonth(), 1)
//       break
//     case "yearly":
//       startDate = new Date(now.getFullYear(), 0, 1)
//       break
//     default:
//       startDate = new Date(0) // All time
//   }

//   return { $gte: startDate }
// }

// module.exports = router
