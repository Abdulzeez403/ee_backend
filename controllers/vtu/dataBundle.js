const User = require("../../models/userModel");

const NETWORK_MAP = {
  // Airtime/Data
  mtn: { easyaccess: "01" },
  airtel: { easyaccess: "03" },
  glo: { easyaccess: "02" },
  "9mobile": { easyaccess: "04" },
};

const purchaseData = async (req, res) => {
  try {
    const { phone, userId, planId, networkId, amount } = req.body;
    console.log(req.body);

    if (!phone || !userId || !planId || !networkId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Check network prefix (4 or 5 digits)
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

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const previousCoin = user?.coin;

    await deduce(userId, plan.ourPrice);

    const networkKey = networkId.toLowerCase();
    const mappedCodes = NETWORK_MAP[networkKey];
    if (!mappedCodes) {
      return res.status(400).json({ error: "Invalid network selected" });
    }

    await EasyAccessService.purchaseData({
      network: mappedCodes.easyaccess,
      dataplan: plan.easyaccessId,
      phone,
    });

    // ❌ FAILURE CONDITION
    if (
      !result ||
      result.success === false ||
      result.data?.success === "false" ||
      result.data?.success === "false_disabled" ||
      result.status === false
    ) {
      await refundToVirtualAccount(userId, amount);

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
        previous_balance: previousBalance,
        new_balance: previousBalance,
      });

      return res.status(400).json({
        error:
          result?.data?.message ||
          result?.error ||
          "Unknown error from provider",
        transactionId: failedTxn?._id,
      });
    }

    // ✅ SUCCESS
    const refundedUser = await User.findById(userId);

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
      previous_balance: previousBalance,
      new_balance: refundedUser.balance,
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

module.exports = {
  purchaseData,
};
