const mongoose = require("mongoose");
const VTpassService = require("../services/vtpass");
const { deductCoins, addCoins } = require("../businessLogic/coin_logic");

// ✅ Handles common VTpass transactions
const handleVTpassTransaction = async ({
  userId,
  amount,
  vtpassCall,
  saveOptions = {},
  res,
  successMessage,
}) => {
  try {
    // Deduct coins before attempting transaction
    await deductCoins(userId, amount);

    // Call VTpass API
    const response = await vtpassCall();
    const { code, response_description, content, requestId } =
      response?.data || {};
    const status = content?.transactions?.status;

    switch (code) {
      case "000": {
        if (status === "delivered") {
          await VTpassService.saveTransaction({
            userId,
            response_data: response.data,
            transaction_type: "VTpass",
            status: "delivered",
            ...saveOptions,
          });
          return res.json({ msg: successMessage, request_id: requestId });
        }

        if (status === "pending") {
          return res.status(202).json({
            msg: "Transaction is pending, please check back later",
            request_id: requestId,
          });
        }

        return res.status(500).json({
          error: "Transaction failed or was not processed correctly",
          details: response.data,
        });
      }

      case "016": // Failed transaction
        await VTpassService.saveTransaction({
          userId,
          response_data: response.data,
          transaction_type: "VTpass",
          status: "failed",
          ...saveOptions,
        });
        await addCoins(userId, amount);
        return res
          .status(500)
          .json({ error: "Transaction Failed", details: response.data });

      case "030": // Biller not reachable
        await addCoins(userId, amount);
        return res
          .status(500)
          .json({ error: "Biller not reachable", details: response.data });

      case "011": // Invalid arguments
        await addCoins(userId, amount);
        return res
          .status(400)
          .json({ error: "Invalid arguments", details: response.data });

      case "012": // Product not found
        await addCoins(userId, amount);
        return res
          .status(404)
          .json({ error: "Product does not exist", details: response.data });

      case "099": // Processing
        return res.status(202).json({
          msg: "Transaction is processing, please requery later",
          request_id: requestId,
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

// ✅ Airtime Purchase
const purchaseAirtime = (req, res) => {
  const { phone, amount, network } = req.body;
  const userId = req.user?.id;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid or missing user ID" });
  }

  return handleVTpassTransaction({
    userId,
    amount,
    vtpassCall: () => VTpassService.purchaseAirtime(phone, amount, network),
    saveOptions: { request_id: phone },
    res,
    successMessage: "Airtime purchase successful",
  });
};

// ✅ Data Purchase
const purchaseData = (req, res) => {
  const { phone, network, variation_code, amount, dataName } = req.body;
  const userId = req.user?.id;

  if (!phone || !network || !variation_code || !amount) {
    return res.status(400).json({ error: "All fields are required!" });
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid or missing user ID" });
  }

  return handleVTpassTransaction({
    userId,
    amount,
    vtpassCall: () =>
      VTpassService.purchaseData(phone, network, variation_code, amount),
    saveOptions: { dataName },
    res,
    successMessage: "Data purchase successful",
  });
};

// ✅ Exam Payment
const payExam = (req, res) => {
  const { pin_type, quantity, variation_code, amount, phone } = req.body;
  const userId = req.user?.id;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid or missing user ID" });
  }

  return handleVTpassTransaction({
    userId,
    amount,
    vtpassCall: () =>
      VTpassService.payExam(pin_type, quantity, variation_code, amount, phone),
    saveOptions: {},
    res,
    successMessage: "Exam payment successful",
  });
};

module.exports = { purchaseAirtime, purchaseData, payExam };
