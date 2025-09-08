const VTpassService = require("../../services/vtpass");
const User = require("../../models/user");
const { deductCoins, addCoins } = require("../../businessLogic/coin_logic");
const { saveTransaction } = require("../../utils/saveTransaction"); // ✅ use same saveTransaction
const mongoose = require("mongoose");

const handleVTpassTransaction = async ({
  userId,
  amount,
  vtpassCall,
  saveOptions = {},
  res,
  successMessage,
}) => {
  try {
    // 🔹 Deduct first
    await deductCoins(userId, amount);

    const userBefore = await User.findById(userId); // ✅ track balances
    const previousBalance = userBefore?.coins || 0;

    // 🔹 Call VTpass
    const response = await vtpassCall();

    const responseCode = response?.data?.code;
    const status = response?.data?.content?.transactions?.status;

    switch (responseCode) {
      case "000": {
        if (status === "delivered") {
          const userAfter = await User.findById(userId);

          await saveTransaction({
            response,
            serviceType: "VTpass",
            status: "success",
            extra: {
              userId,
              amount,
              ...saveOptions,
            },
            transaction_type: "debit",
            previous_balance: previousBalance,
            new_balance: userAfter?.coins || previousBalance,
          });

          return res.json({
            msg: successMessage,
            request_id: response.data.requestId,
          });
        }

        if (status === "pending") {
          return res.status(202).json({
            msg: "Transaction is pending, please check back later",
            request_id: response.data.requestId,
          });
        }

        // ❌ failed but code was 000
        await addCoins(userId, amount);
        return res.status(500).json({
          error: "Transaction failed or was not processed correctly",
          details: response.data,
        });
      }

      case "016": {
        await addCoins(userId, amount);
        await saveTransaction({
          response,
          serviceType: "VTpass",
          status: "failed",
          extra: { userId, amount, ...saveOptions },
          transaction_type: "debit",
          previous_balance: previousBalance,
          new_balance: previousBalance, // refund resets balance
        });

        return res.status(500).json({
          error: "Transaction Failed",
          details: response.data,
        });
      }

      case "030":
        await addCoins(userId, amount);
        return res
          .status(500)
          .json({ error: "Biller not reachable", details: response.data });

      case "011":
        await addCoins(userId, amount);
        return res
          .status(400)
          .json({ error: "Invalid arguments", details: response.data });

      case "012":
        await addCoins(userId, amount);
        return res
          .status(404)
          .json({ error: "Product does not exist", details: response.data });

      case "099":
        return res.status(202).json({
          msg: "Transaction is processing, please requery later",
          request_id: response.data.requestId,
        });

      default:
        await addCoins(userId, amount);
        return res
          .status(500)
          .json({ error: "Unknown response code", details: response.data });
    }
  } catch (error) {
    console.error("❌ Error in handleVTpassTransaction:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

const purchaseAirtime = async (req, res) => {
  const { phone, amount, network } = req.body;
  const userId = req.user?.id;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid or missing user ID" });
  }

  return handleVTpassTransaction({
    userId,
    amount,
    vtpassCall: () => VTpassService.purchaseAirtime(phone, amount, network),
    saveOptions: { phone, network }, // ✅ store more useful info
    res,
    successMessage: "Airtime purchase successful",
  });
};

module.exports = {
  purchaseAirtime,
};
