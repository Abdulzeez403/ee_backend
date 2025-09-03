const axios = require("axios")
const crypto = require("crypto")
const Transaction = require("../models/Transaction")
const User = require("../models/User")
const { generatePaymentReference } = require("../utils/helpers")

class PaymentService {
  // Initialize payment with preferred gateway
  static async initializePayment(userId, packageData, paymentData, gateway = "paystack") {
    try {
      const reference = generatePaymentReference(gateway === "paystack" ? "PS" : "FW")

      // Create transaction record
      const transaction = new Transaction({
        user: userId,
        type: "coin_purchase",
        amount: packageData.price,
        coins: packageData.coins + packageData.bonus,
        description: `Coin purchase: ${packageData.name}`,
        status: "pending",
        paymentGateway: gateway,
        paymentReference: reference,
        metadata: {
          packageId: packageData.id,
          baseCoins: packageData.coins,
          bonusCoins: packageData.bonus,
          ...paymentData,
        },
      })

      await transaction.save()

      let paymentResponse
      if (gateway === "paystack") {
        paymentResponse = await this.initializePaystack(packageData, paymentData, reference, transaction._id)
      } else if (gateway === "flutterwave") {
        paymentResponse = await this.initializeFlutterwave(packageData, paymentData, reference, transaction._id)
      } else {
        throw new Error("Unsupported payment gateway")
      }

      return {
        success: true,
        transaction,
        paymentResponse,
      }
    } catch (error) {
      throw error
    }
  }

  // Initialize Paystack payment
  static async initializePaystack(packageData, paymentData, reference, transactionId) {
    try {
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: paymentData.email,
          amount: packageData.price * 100, // Convert to kobo
          reference,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
          metadata: {
            transactionId: transactionId.toString(),
            packageId: packageData.id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.data.status) {
        return {
          authorization_url: response.data.data.authorization_url,
          access_code: response.data.data.access_code,
          reference,
        }
      } else {
        throw new Error("Paystack initialization failed")
      }
    } catch (error) {
      throw error
    }
  }

  // Initialize Flutterwave payment
  static async initializeFlutterwave(packageData, paymentData, reference, transactionId) {
    try {
      const response = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref: reference,
          amount: packageData.price,
          currency: "NGN",
          redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
          customer: {
            email: paymentData.email,
            phone_number: paymentData.phoneNumber,
            name: paymentData.name,
          },
          customizations: {
            title: "ExamPrep+ Coin Purchase",
            description: `Purchase ${packageData.coins + packageData.bonus} coins`,
            logo: `${process.env.FRONTEND_URL}/logo.png`,
          },
          meta: {
            transactionId: transactionId.toString(),
            packageId: packageData.id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.data.status === "success") {
        return {
          payment_link: response.data.data.link,
          reference,
        }
      } else {
        throw new Error("Flutterwave initialization failed")
      }
    } catch (error) {
      throw error
    }
  }

  // Verify payment with gateway
  static async verifyPayment(reference, gateway) {
    try {
      if (gateway === "paystack") {
        return await this.verifyPaystackPayment(reference)
      } else if (gateway === "flutterwave") {
        return await this.verifyFlutterwavePayment(reference)
      } else {
        throw new Error("Unsupported payment gateway")
      }
    } catch (error) {
      throw error
    }
  }

  // Verify Paystack payment
  static async verifyPaystackPayment(reference) {
    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      })

      return {
        success: response.data.status && response.data.data.status === "success",
        data: response.data.data,
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Verify Flutterwave payment
  static async verifyFlutterwavePayment(reference) {
    try {
      const response = await axios.get(`https://api.flutterwave.com/v3/transactions?tx_ref=${reference}`, {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      })

      if (response.data.status === "success" && response.data.data.length > 0) {
        const transaction = response.data.data[0]
        return {
          success: transaction.status === "successful",
          data: transaction,
        }
      }

      return { success: false }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Process successful payment
  static async processSuccessfulPayment(transactionId, paymentData) {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction || transaction.status !== "pending") {
        throw new Error("Transaction not found or already processed")
      }

      // Add coins to user
      const user = await User.findById(transaction.user)
      await user.addCoins(transaction.coins)

      // Complete transaction
      await transaction.complete({
        paymentData,
        paidAt: new Date(),
      })

      return {
        success: true,
        transaction,
        newCoinBalance: user.coins,
      }
    } catch (error) {
      throw error
    }
  }

  // Handle failed payment
  static async processFailedPayment(transactionId, reason) {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        throw new Error("Transaction not found")
      }

      await transaction.fail(reason)

      return {
        success: true,
        transaction,
      }
    } catch (error) {
      throw error
    }
  }

  // Get payment analytics
  static async getPaymentAnalytics(period = "monthly") {
    try {
      const dateFilter = this.getDateFilter(period)

      const analytics = await Transaction.aggregate([
        {
          $match: {
            type: "coin_purchase",
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: {
              gateway: "$paymentGateway",
              status: "$status",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
            },
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            totalCoins: { $sum: "$coins" },
          },
        },
        {
          $group: {
            _id: {
              gateway: "$_id.gateway",
              date: "$_id.date",
            },
            statuses: {
              $push: {
                status: "$_id.status",
                count: "$count",
                totalAmount: "$totalAmount",
                totalCoins: "$totalCoins",
              },
            },
            dailyTransactions: { $sum: "$count" },
            dailyRevenue: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { "_id.date": 1 },
        },
      ])

      // Calculate success rates
      const successRates = await Transaction.aggregate([
        {
          $match: {
            type: "coin_purchase",
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: "$paymentGateway",
            total: { $sum: 1 },
            successful: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            gateway: "$_id",
            total: 1,
            successful: 1,
            failed: 1,
            pending: 1,
            successRate: {
              $multiply: [{ $divide: ["$successful", "$total"] }, 100],
            },
          },
        },
      ])

      return {
        timeline: analytics,
        successRates,
      }
    } catch (error) {
      throw error
    }
  }

  // Get date filter for analytics
  static getDateFilter(period) {
    const now = new Date()
    let startDate

    switch (period) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(0) // All time
    }

    return { $gte: startDate }
  }

  // Validate webhook signature
  static validateWebhookSignature(payload, signature, gateway) {
    try {
      if (gateway === "paystack") {
        const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(payload).digest("hex")
        return hash === signature
      } else if (gateway === "flutterwave") {
        return signature === process.env.FLUTTERWAVE_SECRET_HASH
      }
      return false
    } catch (error) {
      return false
    }
  }

  // Get supported payment methods
  static getSupportedPaymentMethods() {
    return {
      paystack: {
        name: "Paystack",
        methods: ["card", "bank_transfer", "ussd", "qr"],
        currencies: ["NGN"],
        fees: {
          local: "1.5% + ₦100",
          international: "3.9% + ₦100",
        },
      },
      flutterwave: {
        name: "Flutterwave",
        methods: ["card", "bank_transfer", "ussd", "mobile_money"],
        currencies: ["NGN", "USD", "GBP", "EUR"],
        fees: {
          local: "1.4% + ₦100",
          international: "3.8% + ₦100",
        },
      },
    }
  }

  // Calculate transaction fees
  static calculateFees(amount, gateway, isInternational = false) {
    const feeStructures = {
      paystack: {
        local: { percentage: 0.015, fixed: 100 },
        international: { percentage: 0.039, fixed: 100 },
      },
      flutterwave: {
        local: { percentage: 0.014, fixed: 100 },
        international: { percentage: 0.038, fixed: 100 },
      },
    }

    const structure = feeStructures[gateway]
    if (!structure) return 0

    const feeType = isInternational ? "international" : "local"
    const fees = structure[feeType]

    return Math.round(amount * fees.percentage + fees.fixed)
  }
}

module.exports = PaymentService
