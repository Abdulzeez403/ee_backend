const User = require("../models/userModel");
const PaystackService = require("../services/paystack");
const saveTransaction = require("../utils/saveTransaction");
const generateRefNo = require("../utils/generateRefNo");

const getDurationDays = () => {
  const raw = process.env.MEMBERSHIP_DURATION_DAYS || process.env.SUBSCRIPTION_DURATION_DAYS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 30;
};

const getAmountKobo = () => {
  const rawNaira =
    process.env.MEMBERSHIP_AMOUNT_NAIRA || process.env.SUBSCRIPTION_AMOUNT_NAIRA;
  const rawKobo =
    process.env.MEMBERSHIP_AMOUNT_KOBO || process.env.SUBSCRIPTION_AMOUNT_KOBO;

  const nKobo = Number(rawKobo);
  if (Number.isFinite(nKobo) && nKobo > 0) return Math.round(nKobo);

  const nNaira = Number(rawNaira);
  if (Number.isFinite(nNaira) && nNaira > 0) return Math.round(nNaira * 100);

  return 1000 * 100;
};

const extendMembership = async ({ userId, reference }) => {
  const user = await User.findById(userId);
  if (!user) return null;

  if (user.membership?.lastPaystackReference === reference) {
    const expiresAt = user.membership?.expiresAt
      ? new Date(user.membership.expiresAt)
      : null;
    return { user, expiresAt };
  }

  const now = new Date();
  const durationDays = getDurationDays();
  const currentExpiry =
    user.membership?.expiresAt && new Date(user.membership.expiresAt) > now
      ? new Date(user.membership.expiresAt)
      : now;

  const newExpiry = new Date(currentExpiry);
  newExpiry.setDate(newExpiry.getDate() + durationDays);

  user.membership = {
    ...(user.membership || {}),
    status: "active",
    startedAt: user.membership?.startedAt || now,
    expiresAt: newExpiry,
    lastPaystackReference: reference,
  };

  await user.save();
  return { user, expiresAt: newExpiry };
};

const initializeMembershipPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const reference = generateRefNo("SUB-");
    const amountKobo = getAmountKobo();
    const currency = process.env.MEMBERSHIP_CURRENCY || "NGN";
    const callback_url = process.env.PAYSTACK_CALLBACK_URL || undefined;

    const response = await PaystackService.initializeTransaction({
      email: user.email,
      amountKobo,
      reference,
      currency,
      callback_url,
      metadata: {
        purpose: "membership_subscription",
        userId: String(user._id),
      },
    });

    return res.status(200).json({
      reference,
      authorization_url: response.data?.data?.authorization_url,
      access_code: response.data?.data?.access_code,
    });
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    return res.status(500).json({ message: "Failed to initialize payment", error: message });
  }
};

const verifyMembershipPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const reference = req.params.reference;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!reference) return res.status(400).json({ message: "Reference is required" });

    const verification = await PaystackService.verifyTransaction(reference);
    const data = verification.data?.data;

    if (!data || data.status !== "success") {
      return res.status(400).json({
        message: "Payment not successful",
        status: data?.status || "unknown",
      });
    }

    const metaUserId = data?.metadata?.userId;
    if (metaUserId && String(metaUserId) !== String(userId)) {
      return res.status(403).json({ message: "Reference does not belong to user" });
    }

    const updated = await extendMembership({ userId, reference });
    if (!updated) return res.status(404).json({ message: "User not found" });

    await saveTransaction({
      response: { data },
      serviceType: "subscription",
      status: "success",
      extra: { userId, amount: (data.amount || 0) / 100, reference },
      previous_balance: 0,
      new_balance: 0,
    });

    return res.status(200).json({
      message: "Membership activated",
      expiresAt: updated.expiresAt,
    });
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    return res.status(500).json({ message: "Failed to verify payment", error: message });
  }
};

const membershipStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("membership");
    if (!user) return res.status(404).json({ message: "User not found" });

    const expiresAt = user.membership?.expiresAt ? new Date(user.membership.expiresAt) : null;
    const isActive =
      user.membership?.status === "active" && expiresAt && expiresAt > new Date();

    return res.status(200).json({
      isActive,
      status: user.membership?.status || "inactive",
      expiresAt: user.membership?.expiresAt || null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch membership status" });
  }
};

const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const rawBody = req.rawBody;

    const valid = PaystackService.verifyWebhookSignature({ rawBody, signature });
    if (!valid) return res.status(400).send("Invalid signature");

    const event = req.body;
    const eventType = event?.event;
    const data = event?.data || {};

    if (eventType !== "charge.success") {
      return res.status(200).json({ received: true });
    }

    const purpose = data?.metadata?.purpose;
    if (purpose !== "membership_subscription") {
      return res.status(200).json({ received: true });
    }

    const userId = data?.metadata?.userId;
    const reference = data?.reference;

    if (!userId || !reference) {
      return res.status(200).json({ received: true });
    }

    const updated = await extendMembership({ userId, reference });
    if (updated) {
      await saveTransaction({
        response: { data },
        serviceType: "subscription",
        status: "success",
        extra: { userId, amount: (data.amount || 0) / 100, reference },
        previous_balance: 0,
        new_balance: 0,
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: "Webhook handler error" });
  }
};

module.exports = {
  initializeMembershipPayment,
  verifyMembershipPayment,
  membershipStatus,
  paystackWebhook,
};
