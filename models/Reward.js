const mongoose = require("mongoose")

const rewardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["airtime", "data", "voucher", "badge", "premium"],
      required: true,
    },
    provider: {
      type: String,
      enum: ["MTN", "GLO", "AIRTEL", "9MOBILE", "GENERAL"],
      default: "GENERAL",
    },
    value: {
      type: String,
      required: true, // e.g., "100", "1GB", "Premium 1 Month"
    },
    coinCost: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      default: -1, // -1 means unlimited
    },
    minimumLevel: {
      type: Number,
      default: 1,
    },
    category: {
      type: String,
      enum: ["communication", "education", "entertainment", "achievement"],
      default: "communication",
    },
    redemptionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
rewardSchema.index({ type: 1, provider: 1 })
rewardSchema.index({ coinCost: 1 })
rewardSchema.index({ isActive: 1 })

// Check if reward is available
rewardSchema.methods.isAvailable = function () {
  return this.isActive && (this.stock === -1 || this.stock > 0)
}

// Redeem reward (decrease stock)
rewardSchema.methods.redeem = function () {
  if (!this.isAvailable()) {
    throw new Error("Reward not available")
  }

  if (this.stock > 0) {
    this.stock -= 1
  }
  this.redemptionCount += 1

  return this.save()
}

module.exports = mongoose.model("Reward", rewardSchema)
