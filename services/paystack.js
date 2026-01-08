const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const getClient = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not set");
  }

  return axios.create({
    baseURL: PAYSTACK_BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
};

const safeTimingEqual = (a, b) => {
  const aBuf = Buffer.from(a || "", "utf8");
  const bBuf = Buffer.from(b || "", "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const PaystackService = {
  async initializeTransaction({
    email,
    amountKobo,
    reference,
    currency,
    callback_url,
    metadata,
  }) {
    const client = getClient();
    return client.post("/transaction/initialize", {
      email,
      amount: amountKobo,
      reference,
      currency,
      callback_url,
      metadata,
    });
  },

  async verifyTransaction(reference) {
    const client = getClient();
    return client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
  },

  verifyWebhookSignature({ rawBody, signature }) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || !rawBody || !signature) return false;

    const computed = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    return safeTimingEqual(computed, signature);
  },
};

module.exports = PaystackService;

