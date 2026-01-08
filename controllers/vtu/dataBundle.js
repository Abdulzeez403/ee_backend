const User = require("../../models/userModel");
const { deductCoins, addCoins } = require("../../businessLogic/coin_logic");
const saveTransaction = require("../../utils/saveTransaction");
const PayOnceService = require("../../services/payonce");
const purchaseData = async (req, res) => {
  const userId = req.user?.id;
  const { phone, planId, networkId, amount } = req.body;

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

  if (!networkId || !planId || !phone) {
    return res.status(400).json({
      error: "Missing required fields: networkId, planId, phone",
    });
  }

  const userBefore = await User.findById(userId);
  if (!userBefore) {
    return res.status(404).json({ error: "User not found" });
  }

  const previousBalance = userBefore?.coins || 0;
  let didDeduct = false;

  try {
    await deductCoins(userId, normalizedAmount);
    didDeduct = true;

    const response = await PayOnceService.purchaseData({
      networkId,
      planId,
      phone,
      amount: normalizedAmount,
    });

    const data = response?.data || {};
    const isFailed =
      data?.success === false ||
      String(data?.status || "").toLowerCase() === "failed" ||
      String(data?.status || "").toLowerCase() === "error";

    if (isFailed) {
      await addCoins(userId, normalizedAmount);
      const refundedUser = await User.findById(userId);

      const failedTxn = await saveTransaction({
        response,
        serviceType: "data",
        status: "failed",
        extra: {
          userId,
          amount: normalizedAmount,
          phone,
          network: networkId,
          dataplan: planId,
        },
        previous_balance: previousBalance,
        new_balance: refundedUser?.coins ?? previousBalance,
      });

      return res.status(400).json({
        error: data?.message || "Data purchase failed",
        transactionId: failedTxn?._id,
        details: data,
      });
    }

    const userAfter = await User.findById(userId);
    const savedTxn = await saveTransaction({
      response,
      serviceType: "data",
      status: "success",
      extra: {
        userId,
        amount: normalizedAmount,
        phone,
        network: networkId,
        dataplan: planId,
      },
      previous_balance: previousBalance,
      new_balance: userAfter?.coins ?? previousBalance,
    });

    return res.status(200).json({
      message: "✅ Data bundle purchased successfully",
      transactionId: savedTxn?._id,
      data,
    });
  } catch (error) {
    if (didDeduct) {
      await addCoins(userId, normalizedAmount).catch(() => {});
    }

    return res.status(500).json({
      error: "Data purchase error",
      details: error.response?.data || error.message,
    });
  }
};

module.exports = { purchaseData };
