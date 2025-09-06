const Transaction = require("../models/transaction");
const User = require("../models/User");
const generateRefNo = require("../utils/generateRefNo");

const saveTransaction = async ({
  response,
  serviceType,
  status,
  previous_balance,
  new_balance,
  extra = {},
}) => {
  const data = response?.data || {};
  const refNo = generateRefNo();

  const baseTransaction = {
    service: serviceType,
    message: data.message || response?.message || "No message",
    amount: extra.amount || Number(data.amount) || 0,
    reference_no: refNo || null,
    status: status || "failed",
    transaction_date: new Date(),
    raw_response: JSON.stringify(response || {}),
    userId: extra.userId,
    previous_balance: previous_balance || 0,
    new_balance: new_balance || 0,
  };

  let details = {};

  switch (serviceType) {
    case "airtime":
      details = {
        network: extra.network || data.networkDiscovered || null,
        mobile_no: extra.phone || data.phone || null,
      };
      break;
    case "data":
      details = {
        network: data.network || extra.network,
        mobile_no: data.mobileno || extra.phone,
        data_type: data.dataplan || extra.dataplan,
        client_reference: data.client_reference,
      };
      break;
    case "data_card":
      details = {
        network: data.network,
        data_type: data.data_type,
        pin: data.pin,
      };
      break;
    case "cable_tv":
      details = {
        company: data.company,
        package: data.package,
        iucno: data.iucno,
      };
      break;
    case "electricity":
      details = {
        company: data.company,
        meter_type: data.metertype,
        meter_no: data.meterno,
        token: data.token,
        customer_name: data.customer_name,
        customer_address: data.customer_address,
      };
      break;
    case "exam_pin":
      details = {
        waec_pin: data.pin,
        neco_token: data.pin,
        nabteb_pin: data.pin,
      };
      break;
    case "wallet":
      details = {
        transaction_type:
          extra.transaction_type || data.transaction_type || null,
        note: extra.note || data.note || null,
      };
      break;
    default:
      console.warn("Unknown service type:", serviceType);
      return;
  }

  const finalTransaction = { ...baseTransaction, ...details };

  try {
    const saved = await Transaction.create(finalTransaction);
    console.log(`[${serviceType}] Transaction ${status} saved:`, saved._id);

    // 🔹 Referral Bonus Logic
    if (status === "success" && extra.userId) {
      const user = await User.findById(extra.userId);

      if (user && user.referredBy && !user.referralBonusGiven) {
        const referrer = await User.findOne({ referralCode: user.referredBy });

        if (referrer) {
          const bonusAmount = 500; // Set your bonus per referral
          referrer.bonus = (referrer.bonus || 0) + bonusAmount;
          referrer.totalBonus = (referrer.totalBonus || 0) + bonusAmount;

          // Increment total referred users
          referrer.totalReferrals = (referrer.totalReferrals || 0) + 1;

          await referrer.save();

          // 🔹 Save referral bonus as a transaction
          await Transaction.create({
            userId: referrer._id,
            service: "referral_bonus",
            message: `Referral bonus for ${user.email}`,
            amount: bonusAmount,
            status: "success",
            transaction_date: new Date(),
            reference_no: `REF-${Date.now()}`, // or use your generateRefNo()
            previous_balance: referrer.bonus - bonusAmount,
            new_balance: referrer.bonus,
            // raw_response: JSON.stringify({ referredUserId: user._id || "" }),
          });

          // Mark that the bonus has been given to the referred user
          user.referralBonusGiven = true;
          await user.save();

          console.log(
            `💰 Referral bonus credited to ${referrer.email} for user ${user.email}. Total referrals: ${referrer.totalReferrals}, Total bonus: ${referrer.totalBonus}`
          );
        }
      }
    }

    return saved;
  } catch (error) {
    console.error("❌ Error saving transaction:", error);
  }
};

module.exports = saveTransaction;
