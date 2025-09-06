const { deductCoins, addCoins } = require("../coinController");
const EasyAccessService = require("../../services/easyAccess");
const { saveTransaction } = require("../../utils/saveTransaction");

const NETWORK_MAP = {
  mtn: { easyaccess: "01" },
  airtel: { easyaccess: "03" },
  glo: { easyaccess: "02" },
  "9mobile": { easyaccess: "04" },
};

// Example: define prefix rules somewhere globally (or DB)
const NETWORK_PREFIXES = {
  mtn: ["0803", "0806", "0703", "0706", "0810", "0813", "0814", "0816"],
  airtel: ["0802", "0808", "0708", "0812", "0701"],
  glo: ["0805", "0807", "0811", "0815"],
  "9mobile": ["0809", "0817", "0818", "0909"],
};

const purchaseData = async (req, res) => {
  try {
    const { phone, userId, plan, networkId, amount } = req.body;

    if (!phone || !userId || !plan || !networkId || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Validate phone prefix
    const phonePrefix4 = phone.substring(0, 4);
    const phonePrefix5 = phone.substring(0, 5);
    const validPrefixes = NETWORK_PREFIXES[networkId.toLowerCase()];
    if (
      !validPrefixes ||
      (!validPrefixes.includes(phonePrefix4) &&
        !validPrefixes.includes(phonePrefix5))
    ) {
      return res.status(400).json({
        error: `❌ Phone number ${phone} does not match ${networkId.toUpperCase()} network.`,
      });
    }

    // ✅ Deduct coins first
    await deductCoins(userId, plan.ourPrice);

    const networkKey = networkId.toLowerCase();
    const mappedCodes = NETWORK_MAP[networkKey];
    if (!mappedCodes) {
      await addCoins(userId, plan.ourPrice); // refund immediately
      return res.status(400).json({ error: "Invalid network selected" });
    }

    // ✅ Call provider
    const result = await EasyAccessService.purchaseData({
      network: mappedCodes.easyaccess,
      dataplan: plan.easyaccessId,
      phone,
    });

    // ❌ Handle failure
    if (
      !result ||
      result.success === false ||
      result.data?.success === "false" ||
      result.data?.success === "false_disabled" ||
      result.status === false
    ) {
      await addCoins(userId, plan.ourPrice);

      const failedTxn = await saveTransaction({
        response: result || {},
        serviceType: "data",
        status: "failed",
        extra: {
          userId,
          amount: plan.ourPrice,
          phone,
          network: networkId,
          dataplan: plan?.name || "",
        },
        transaction_type: "debit",
      });

      return res.status(400).json({
        error:
          result?.data?.message ||
          result?.error ||
          "Unknown error from provider",
        transactionId: failedTxn?._id,
      });
    }

    // ✅ Handle success
    const savedTxn = await saveTransaction({
      response: result,
      serviceType: "data",
      status: "success",
      extra: {
        userId,
        amount: plan.ourPrice,
        phone,
        network: networkId,
        dataplan: plan?.name || "",
        client_reference: result?.data?.client_reference,
      },
      transaction_type: "debit",
    });

    return res.status(200).json({
      message: "✅ Data bundle purchased successfully",
      transactionId: savedTxn?._id,
    });
  } catch (error) {
    console.error("❌ Error purchasing data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message || "An unexpected error occurred",
    });
  }
};

module.exports = { purchaseData };
