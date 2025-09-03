const PaymentService = require("../services/paymentService")
const Transaction = require("../models/Transaction")
const User = require("../models/User")

class PaymentController {
  // Get available coin packages with pricing
  static getCoinPackages() {
    return [
      {
        id: "starter",
        name: "Starter Pack",
        coins: 50,
        price: 200,
        bonus: 0,
        popular: false,
        description: "Perfect for trying out the platform",
      },
      {
        id: "basic",
        name: "Basic Pack",
        coins: 100,
        price: 500,
        bonus: 10,
        popular: false,
        description: "Great for casual learners",
      },
      {
        id: "standard",
        name: "Standard Pack",
        coins: 250,
        price: 1000,
        bonus: 50,
        popular: true,
        description: "Most popular choice",
      },
      {
        id: "premium",
        name: "Premium Pack",
        coins: 500,
        price: 2000,
        bonus: 125,
        popular: false,
        description: "For serious students",
      },
      {
        id: "ultimate",
        name: "Ultimate Pack",
        coins: 1000,
        price: 3500,
        bonus: 300,
        popular: false,
        description: "Maximum value pack",
      },
      {
        id: "mega",
        name: "Mega Pack",
        coins: 2500,
        price: 8000,
        bonus: 875,
        popular: false,
        description: "For power users",
      },
    ]
  }

  // Calculate package value and savings
  static calculatePackageValue(packageData) {
    const baseValue = packageData.coins * 5 // Assume 1 coin = 5 naira base value
    const totalCoins = packageData.coins + packageData.bonus
    const actualValue = totalCoins * 5
    const savings = actualValue - packageData.price
    const savingsPercentage = (savings / actualValue) * 100

    return {
      baseCoins: packageData.coins,
      bonusCoins: packageData.bonus,
      totalCoins,
      price: packageData.price,
      baseValue,
      actualValue,
      savings: Math.max(0, savings),
      savingsPercentage: Math.max(0, savingsPercentage),
      pricePerCoin: packageData.price / totalCoins,
    }
  }

  // Get personalized package recommendations
  static async getPersonalizedRecommendations(userId) {
    try {
      const user = await User.findById(userId)

      // Get user's spending history
      const spendingHistory = await Transaction.find({
        user: userId,
        type: "coin_purchase",
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .limit(5)

      // Get user's coin usage pattern
      const coinUsage = await Transaction.find({
        user: userId,
        coins: { $lt: 0 },
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .limit(10)

      const packages = this.getCoinPackages()
      const recommendations = []

      // Calculate average spending
      const avgSpending =
        spendingHistory.length > 0
          ? spendingHistory.reduce((sum, t) => sum + t.amount, 0) / spendingHistory.length
          : 500

      // Calculate coin burn rate (coins spent per day)
      const coinBurnRate = this.calculateCoinBurnRate(coinUsage)

      // Recommend based on user level and usage
      if (user.level <= 3) {
        // New users - recommend starter/basic
        recommendations.push(packages.find((p) => p.id === "starter"))
        recommendations.push(packages.find((p) => p.id === "basic"))
      } else if (user.level <= 7) {
        // Intermediate users - recommend standard/premium
        recommendations.push(packages.find((p) => p.id === "standard"))
        recommendations.push(packages.find((p) => p.id === "premium"))
      } else {
        // Advanced users - recommend premium/ultimate
        recommendations.push(packages.find((p) => p.id === "premium"))
        recommendations.push(packages.find((p) => p.id === "ultimate"))
      }

      // Add value-based recommendation
      const bestValuePackage = packages.reduce((best, current) => {
        const currentValue = this.calculatePackageValue(current)
        const bestValue = this.calculatePackageValue(best)
        return currentValue.savingsPercentage > bestValue.savingsPercentage ? current : best
      })

      if (!recommendations.find((r) => r.id === bestValuePackage.id)) {
        recommendations.push(bestValuePackage)
      }

      return {
        recommendations: recommendations.slice(0, 3),
        userStats: {
          level: user.level,
          currentCoins: user.coins,
          avgSpending,
          coinBurnRate,
        },
      }
    } catch (error) {
      throw error
    }
  }

  // Calculate coin burn rate
  static calculateCoinBurnRate(coinUsage) {
    if (coinUsage.length === 0) return 0

    const totalCoinsSpent = coinUsage.reduce((sum, t) => sum + Math.abs(t.coins), 0)
    const daysSinceFirst = Math.max(
      1,
      Math.ceil((new Date() - coinUsage[coinUsage.length - 1].createdAt) / (1000 * 60 * 60 * 24)),
    )

    return totalCoinsSpent / daysSinceFirst
  }

  // Process payment callback
  static async processPaymentCallback(gateway, reference, status) {
    try {
      const transaction = await Transaction.findOne({
        paymentReference: reference,
        paymentGateway: gateway,
        status: "pending",
      })

      if (!transaction) {
        throw new Error("Transaction not found")
      }

      if (status === "success") {
        // Verify payment with gateway
        const verification = await PaymentService.verifyPayment(reference, gateway)

        if (verification.success) {
          // Add coins to user
          const user = await User.findById(transaction.user)
          await user.addCoins(transaction.coins)

          // Complete transaction
          await transaction.complete({
            verificationData: verification.data,
            paidAt: new Date(),
          })

          return {
            success: true,
            message: "Payment successful",
            coinsAdded: transaction.coins,
            newBalance: user.coins,
          }
        } else {
          await transaction.fail("Payment verification failed")
          return {
            success: false,
            message: "Payment verification failed",
          }
        }
      } else {
        await transaction.fail(`Payment ${status}`)
        return {
          success: false,
          message: `Payment ${status}`,
        }
      }
    } catch (error) {
      throw error
    }
  }

  // Get payment statistics for admin
  static async getPaymentStatistics(period = "monthly") {
    try {
      const analytics = await PaymentService.getPaymentAnalytics(period)

      // Calculate additional metrics
      const totalRevenue = analytics.timeline.reduce((sum, item) => sum + item.dailyRevenue, 0)
      const totalTransactions = analytics.timeline.reduce((sum, item) => sum + item.dailyTransactions, 0)
      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

      // Get top packages
      const topPackages = await Transaction.aggregate([
        {
          $match: {
            type: "coin_purchase",
            status: "completed",
            createdAt: PaymentService.getDateFilter(period),
          },
        },
        {
          $group: {
            _id: "$metadata.packageId",
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
            coinsIssued: { $sum: "$coins" },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 5,
        },
      ])

      return {
        overview: {
          totalRevenue,
          totalTransactions,
          avgTransactionValue,
          period,
        },
        timeline: analytics.timeline,
        successRates: analytics.successRates,
        topPackages,
      }
    } catch (error) {
      throw error
    }
  }

  // Handle refund request
  static async processRefund(transactionId, reason, adminId) {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction || transaction.type !== "coin_purchase") {
        throw new Error("Transaction not found or not eligible for refund")
      }

      if (transaction.status !== "completed") {
        throw new Error("Only completed transactions can be refunded")
      }

      // Check if user still has enough coins
      const user = await User.findById(transaction.user)
      if (user.coins < transaction.coins) {
        throw new Error("User doesn't have enough coins for refund")
      }

      // Deduct coins from user
      await user.spendCoins(transaction.coins)

      // Create refund transaction
      const refundTransaction = new Transaction({
        user: transaction.user,
        type: "refund",
        amount: -transaction.amount,
        coins: -transaction.coins,
        description: `Refund for transaction ${transaction._id}`,
        status: "completed",
        metadata: {
          originalTransaction: transaction._id,
          reason,
          processedBy: adminId,
        },
      })

      await refundTransaction.save()

      // Update original transaction
      transaction.metadata = {
        ...transaction.metadata,
        refunded: true,
        refundTransaction: refundTransaction._id,
        refundReason: reason,
      }
      await transaction.save()

      return {
        success: true,
        refundTransaction,
        message: "Refund processed successfully",
      }
    } catch (error) {
      throw error
    }
  }
}

module.exports = PaymentController
