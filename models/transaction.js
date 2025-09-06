const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    service: {
      type: String,
      enum: [
        "airtime",
        "data",
        "data_card",
        "cable_tv",
        "electricity",
        "exam_pin",
        "wallet",
        "referral_bonus",
      ],
      required: true,
    },

    message: String,
    amount: Number,
    reference_no: String,
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "pending",
    },
    transaction_date: Date,
    raw_response: String, // JSON string for full API response

    // Common optional fields
    client_reference: String,

    // Data subscription
    network: String,
    mobile_no: String,
    data_type: String,

    // Data card
    pin: String,

    // Exam PINs
    waec_pin: String,
    neco_token: String,
    nabteb_pin: String,
    nbais_pin: String,

    // Wallet-specific
    transaction_type: {
      type: String,
      enum: ["credit", "debit"],
    },
    previous_balance: Number,
    new_balance: Number,
    note: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Optional indexes for faster lookups
// transactionSchema.index({ reference_no: 1 });
// transactionSchema.index({ service: 1 });
// transactionSchema.index({ userId: 1, transaction_date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
