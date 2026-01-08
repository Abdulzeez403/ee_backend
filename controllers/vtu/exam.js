const User = require("../../models/userModel");
const saveTransaction = require("../../utils/saveTransaction");
const { deductCoins, addCoins } = require("../../businessLogic/coin_logic");
const PayOnceService = require("../../services/payonce");


/**
 * Purchase Exam Pin
 */
const purchaseExamPin = async (req, res) => {
  const userId = req.user?.id;
  const { noOfPin, amount, planId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!process.env.PAYONCE_API_KEY) {
    return res.status(500).json({ success: false, message: "PAYONCE_API_KEY is not set" });
  }

  if (!planId || !noOfPin) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: planId, noOfPin",
    });
  }

  const normalizedAmount = Number(amount);
  const shouldCharge = Number.isFinite(normalizedAmount) && normalizedAmount > 0;

  const userBefore = await User.findById(userId);
  if (!userBefore) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const previousBalance = userBefore.coins || 0;
  let didDeduct = false;
  const provider = "payonce";

  try {
    if (shouldCharge) {
      await deductCoins(userId, normalizedAmount);
      didDeduct = true;
    }

    const response = await PayOnceService.purchaseExamPin({ planId, noOfPin });

    const data = response?.data || {};
    const isFailed =
      data?.success === false ||
      String(data?.status || "").toLowerCase() === "failed" ||
      String(data?.status || "").toLowerCase() === "error";

    if (isFailed) {
      if (didDeduct) {
        await addCoins(userId, normalizedAmount);
      }

      const refundedUser = await User.findById(userId);

      const transaction = await saveTransaction({
        response,
        serviceType: "exam_pin",
        status: "failed",
        extra: {
          userId,
          planId,
          noOfPin,
          amount: shouldCharge ? normalizedAmount : 0,
          provider,
        },
        previous_balance: previousBalance,
        new_balance: refundedUser?.coins ?? previousBalance,
      });

      return res.status(400).json({
        success: false,
        message:
          data?.message || "Exam pin purchase failed",
        transactionId: transaction?._id,
        details: data,
      });
    }

    const updatedUser = await User.findById(userId);

    const transaction = await saveTransaction({
      response,
      serviceType: "exam_pin",
      status: "success",
      extra: {
        userId,
        planId,
        noOfPin,
        amount: shouldCharge ? normalizedAmount : 0,
        provider,
      },
      previous_balance: previousBalance,
      new_balance: updatedUser?.coins ?? previousBalance,
    });

    return res.status(200).json({
      success: true,
      message: "✅ Exam pin purchase successful",
      data,
      transactionId: transaction?._id,
    });
  } catch (error) {
    if (didDeduct) {
      await addCoins(userId, normalizedAmount).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Exam pin purchase error",
      details: error.response?.data || error.message,
    });
  }
};

module.exports = {
  purchaseExamPin,
};
  
