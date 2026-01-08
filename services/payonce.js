const axios = require("axios");

const PAYONCE_BASE_URL =
  process.env.PAYONCE_BASE_URL || "https://api.payonce.com.ng/api/v1";

const getClient = () => {
  const apiKey = process.env.PAYONCE_API_KEY;
  if (!apiKey) {
    throw new Error("PAYONCE_API_KEY is not set");
  }

  return axios.create({
    baseURL: PAYONCE_BASE_URL,
    timeout: 15000,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
};

const PayOnceService = {
  async purchaseAirtime({ networkId, phone, amount, airtimeType }) {
    const client = getClient();
    return client.post("/purchase/airtime", {
      networkId,
      phone,
      amount,
      airtimeType: airtimeType || "VTU",
    });
  },

  async purchaseData({ networkId, planId, phone, amount }) {
    const client = getClient();
    return client.post("/purchase/data", {
      networkId,
      planId,
      phone,
      amount,
    });
  },

  async purchaseExamPin({ planId, noOfPin }) {
    const client = getClient();
    return client.post("/purchase/exam-pin", {
      planId,
      noOfPin,
    });
  },
};

module.exports = PayOnceService;

