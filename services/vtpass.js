const axios = require("axios");
require("dotenv").config();
const { generateRequestId } = require("../utils/generateRequestId");

const VTPASS_API_BASE_URL = process.env.VTPASS_BASE_URL;
const HEADERS = {
  "api-key": process.env.VTPASS_API_KEY,
  "public-key": process.env.VTPASS_PUBLIC_KEY,
  "secret-key": process.env.VTPASS_SECRET_KEY,
  "Content-Type": "application/json",
};

const VTpassService = {
  /**
   * Generic GET request handler
   */
  async makeGetRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${VTPASS_API_BASE_URL}/${endpoint}`, {
        headers: HEADERS,
        params,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "VTpass GET Request Error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || "GET request failed",
      };
    }
  },

  /**
   * Generic POST request handler
   */

  async makePostRequest(endpoint, payload) {
    try {
      const response = await axios.post(
        `${VTPASS_API_BASE_URL}/${endpoint}`,
        payload,
        { headers: HEADERS } // 10s timeout
      );

      // console.log("✅ VTpass Response:", response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      console.error("❌ VTpass POST Request Error:", errorMsg);

      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  /**
   * Save transaction to database


  /**
   * Purchase Airtime
   */
  async purchaseAirtime(phone, amount, network) {
    const request_id = generateRequestId();
    const payload = { request_id, serviceID: network, phone, amount };
    return this.makePostRequest("pay", payload);
  },

  /**
   * Purchase Data
   */
  async purchaseData(phone, network, variation_code, amount) {
    const payload = {
      request_id: generateRequestId(),
      serviceID: network,
      billersCode: phone,
      phone,
      variation_code,
      amount,
    };
    return this.makePostRequest("pay", payload);
  },

  /**
   * Purchase Exam PINs (WAEC, JAMB, NECO)
   */
  async payExam(pin_type, quantity, variation_code, amount, phone) {
    const payload = {
      request_id: generateRequestId(),
      serviceID: pin_type,
      quantity,
      variation_code,
      amount,
      phone,
    };
    return this.makePostRequest("pay", payload);
  },
};

module.exports = VTpassService;
