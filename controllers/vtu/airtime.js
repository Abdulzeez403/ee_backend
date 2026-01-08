const User = require("../../models/userModel");
const { deductCoins, addCoins } = require("../../businessLogic/coin_logic");
const saveTransaction = require("../../utils/saveTransaction");
const PayOnceService = require("../../services/payonce");

const purchaseAirtime = async (req, res) => {
  const { phone, amount, networkId, airtimeType } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.PAYONCE_API_KEY) {
    return res.status(500).json({ error: "PAYONCE_API_KEY is not set" });
  }

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  if (!networkId || !phone) {
    return res
      .status(400)
      .json({ error: "Missing required fields: networkId, phone" });
  }

  const userBefore = await User.findById(userId);
  if (!userBefore) {
    return res.status(404).json({ error: "User not found" });
  }

  const previousBalance = userBefore.coins || 0;
  let didDeduct = false;

  try {
    await deductCoins(userId, normalizedAmount);
    didDeduct = true;

    const response = await PayOnceService.purchaseAirtime({
      networkId,
      phone,
      amount: normalizedAmount,
      airtimeType,
    });

    const data = response?.data || {};
    const isFailed =
      data?.success === false ||
      data?.status === 400 ||
      String(data?.status || "").toLowerCase() === "error";

    if (isFailed) {
      await addCoins(userId, normalizedAmount);

      const refundedUser = await User.findById(userId);

      const txn = await saveTransaction({
        response,
        serviceType: "airtime",
        status: "failed",
        extra: {
          userId,
          amount: normalizedAmount,
          phone,
          network: networkId,
        },
        previous_balance: previousBalance,
        new_balance: refundedUser?.coins ?? previousBalance,
      });

      return res.status(400).json({
        error: data?.message || "Airtime purchase failed",
        transactionId: txn?._id,
        details: data,
      });
    }

    const userAfter = await User.findById(userId);

    const txn = await saveTransaction({
      response,
      serviceType: "airtime",
      status: "success",
      extra: {
        userId,
        amount: normalizedAmount,
        phone,
        network: networkId,
      },
      previous_balance: previousBalance,
      new_balance: userAfter?.coins ?? previousBalance,
    });

    return res.status(200).json({
      message: "✅ Airtime purchase successful",
      transactionId: txn?._id,
      data,
    });
  } catch (error) {
    if (didDeduct) {
      await addCoins(userId, normalizedAmount).catch(() => {});
    }
    return res.status(500).json({
      error: "Airtime purchase error",
      details: error.response?.data || error.message,
    });
  }
};

module.exports = {
  purchaseAirtime,
};
