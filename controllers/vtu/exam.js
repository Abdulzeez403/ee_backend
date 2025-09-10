const EasyAccessService = require("../../services/easyaccess");
const User = require("../../models/user");
const saveTransaction = require("../../utils/saveTransaction");
const { deductCoins, addCoins } = require("../../businessLogic/coin_logic");

const ALLOWED_PIN_COUNTS = [1, 2, 3, 4, 5, 10];

/**
 * Purchase Exam Pin
 */
const purchaseExamPin = async (req, res) => {
  try {
    const { noOfPin, amount, type, userId, pinCode, planId } = req.body;

    // 🔹 1. Validate required fields
    if (!noOfPin || !type || !planId || !userId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: 'noOfPin', 'type', 'planId', and 'userId' are mandatory",
      });
    }

    // 🔹 2. Validate pin count
    if (!ALLOWED_PIN_COUNTS.includes(Number(noOfPin))) {
      return res.status(400).json({
        success: false,
        message: "Invalid number of pins. Allowed values: 1, 2, 3, 4, 5, 10",
      });
    }

    // 🔹 3. Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const enabledApi = "easyaccess";
    const previousBalance = user.coin;

    // 🔹 6. Deduct coins first
    await deductCoins(userId, amount);

    // 🔹 7. Call provider
    let result;
    if (enabledApi === "easyaccess") {
      result = await EasyAccessService.purchaseExamPin({
        no_of_pins: noOfPin,
        type,
      });
    } else {
      await addCoins(userId, amount); // refund if invalid provider
      return res.status(400).json({
        success: false,
        message: "Invalid provider configured for this plan",
      });
    }

    // 🔹 8. Check result status
    const isFailed =
      !result ||
      result.success === false ||
      result.status === false ||
      result.data?.success === "false";

    let transaction;

    if (isFailed) {
      // Refund coins
      await addCoins(userId, amount);

      transaction = await saveTransaction({
        response: result || {},
        serviceType: "exam_pin",
        status: "failed",
        extra: {
          userId,
          planId,
          type,
          noOfPin,
          amount,
          provider: enabledApi,
        },
        previous_balance: previousBalance,
        new_balance: previousBalance,
      });

      return res.status(400).json({
        success: false,
        message:
          result?.data?.message || result?.error || "Exam pin purchase failed",
        transactionId: transaction._id,
      });
    }

    // 🔹 9. Success transaction
    const updatedUser = await User.findById(userId);

    transaction = await saveTransaction({
      response: result || {},
      serviceType: "exam_pin",
      status: "success",
      extra: {
        userId,
        planId,
        type,
        noOfPin,
        amount,
        provider: enabledApi,
      },
      previous_balance: previousBalance,
      new_balance: updatedUser.coin,
    });

    return res.status(200).json({
      success: true,
      message: "✅ Exam pin purchase successful",
      data: result.data,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("❌ Error purchasing exam pin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  purchaseExamPin,
};
