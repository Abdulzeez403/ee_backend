const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();
const { generateRequestId } = require("../utils/generateRequestId");

const EASY_BASE_URL = process.env.EASYACCESS_BASE_URL;
const EASY_TOKEN = process.env.EASYACCESS_API_KEY;

const EasyAccessService = {
  /**
   * Get all available plans for a given product type
   */
  async getPlans(productType) {
    const url = `${EASY_BASE_URL}/api/get_plans.php?product_type=${productType}`;

    try {
      const response = await axios.get(url, {
        headers: {
          AuthorizationToken: EASY_TOKEN,
          "cache-control": "no-cache",
        },
        timeout: 10000,
      });

      return { success: true, data: response.data };
    } catch (error) {
      const errMsg = error.response?.data || error.message;
      console.error("❌ EasyAccess Get Plans Error:", errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Make POST request to EasyAccess
   */
  async makePostRequest(endpoint, payload) {
    try {
      const formData = new FormData();
      for (const key in payload) {
        formData.append(key, payload[key]);
      }

      const response = await axios.post(
        `${EASY_BASE_URL}/${endpoint}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            AuthorizationToken: EASY_TOKEN,
            "cache-control": "no-cache",
          },
          // timeout: 10000,
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "❌ EasyAccess POST Error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || "EasyAccess POST failed",
      };
    }
  },

  async purchaseExamPin({ no_of_pins, max_amount_payable, type }) {
    const payload = {
      type,
      no_of_pins,
      // max_amount_payable,
    };
    return this.makePostRequest(`api/${type}_v2.php`, payload);
  },

  /**
   * Purchase Data
   */
  async purchaseData({ phone, network, dataplan, max_amount_payable }) {
    const request_id = generateRequestId();
    const payload = {
      network,
      mobileno: phone,
      dataplan,
      client_reference: request_id,
      max_amount_payable,
    };

    return this.makePostRequest("api/data.php", payload);
  },
};

module.exports = EasyAccessService;
