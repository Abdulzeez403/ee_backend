const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { generateTokens } = require("../utils/helpers")

class AuthService {
  // Validate and decode JWT token
  static async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId).select("-password -refreshTokens")

      if (!user || !user.isActive) {
        throw new Error("Invalid token or user not found")
      }

      return user
    } catch (error) {
      throw new Error("Invalid token")
    }
  }

  // Generate password reset token
  static generateResetToken() {
    return jwt.sign({ type: "password_reset" }, process.env.JWT_SECRET, { expiresIn: "1h" })
  }

  // Generate email verification token
  static generateVerificationToken(userId) {
    return jwt.sign({ userId, type: "email_verification" }, process.env.JWT_SECRET, { expiresIn: "24h" })
  }

  // Verify password reset token
  static verifyResetToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      if (decoded.type !== "password_reset") {
        throw new Error("Invalid token type")
      }
      return decoded
    } catch (error) {
      throw new Error("Invalid or expired reset token")
    }
  }

  // Clean expired refresh tokens
  static async cleanExpiredTokens(userId) {
    try {
      const user = await User.findById(userId)
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((rt) => rt.expiresAt > new Date())
        await user.save()
      }
    } catch (error) {
      console.error("Error cleaning expired tokens:", error)
    }
  }

  // Check if user has permission
  static hasPermission(user, requiredRole) {
    const roleHierarchy = {
      user: 1,
      moderator: 2,
      admin: 3,
    }

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
  }

  // Generate API key for external integrations
  static generateApiKey(userId) {
    return jwt.sign({ userId, type: "api_key" }, process.env.JWT_SECRET, { expiresIn: "1y" })
  }

  // Rate limiting check
  static async checkRateLimit(userId, action, limit = 5, windowMs = 15 * 60 * 1000) {
    // This would typically use Redis for production
    // For now, we'll implement a simple in-memory solution
    const key = `${userId}:${action}`
    const now = Date.now()

    // In production, use Redis with sliding window
    // For demo purposes, we'll just return true
    return true
  }
}

module.exports = AuthService
