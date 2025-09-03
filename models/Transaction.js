const mongoose = require("mongoose")

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["coin_purchase", "reward_redemption", "quiz_reward", "bonus", "refund"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    coins: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paymentGateway: {
      type: String,
      enum: ["paystack", "flutterwave", "internal"],
      default: "internal",
    },
    paymentReference: {
      type: String,
      default: null,
    },
    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      default: null,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 })
transactionSchema.index({ type: 1, status: 1 })
transactionSchema.index({ paymentReference: 1 })

// Mark transaction as completed
transactionSchema.methods.complete = function (metadata = {}) {
  this.status = "completed"
  this.processedAt = new Date()
  this.metadata = { ...this.metadata, ...metadata }
  return this.save()
}

// Mark transaction as failed
transactionSchema.methods.fail = function (reason) {
  this.status = "failed"
  this.processedAt = new Date()
  this.metadata = { ...this.metadata, failureReason: reason }
  return this.save()
}

module.exports = mongoose.model("Transaction", transactionSchema)
