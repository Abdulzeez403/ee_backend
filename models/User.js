const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    experience: {
      type: Number,
      default: 0,
      min: 0,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastQuizDate: {
      type: Date,
      default: null,
    },
    subjects: [
      {
        name: String,
        level: { type: Number, default: 1 },
        experience: { type: Number, default: 0 },
      },
    ],
    achievements: [
      {
        name: String,
        description: String,
        earnedAt: { type: Date, default: Date.now },
        icon: String,
      },
    ],
    preferences: {
      notifications: { type: Boolean, default: true },
      soundEffects: { type: Boolean, default: true },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Index for performance
userSchema.index({ email: 1 })
userSchema.index({ username: 1 })
userSchema.index({ totalScore: -1 })

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Calculate level based on experience
userSchema.methods.calculateLevel = function () {
  this.level = Math.floor(this.experience / 1000) + 1
  return this.level
}

// Add coins method
userSchema.methods.addCoins = function (amount) {
  this.coins += amount
  return this.save()
}

// Spend coins method
userSchema.methods.spendCoins = function (amount) {
  if (this.coins < amount) {
    throw new Error("Insufficient coins")
  }
  this.coins -= amount
  return this.save()
}

module.exports = mongoose.model("User", userSchema)
