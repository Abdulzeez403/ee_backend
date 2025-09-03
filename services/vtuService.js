const Transaction = require("../models/Transaction");
const User = require("../models/User");
const coinService = require("./coinService");
const axios = require("axios");

class VTUService {
  constructor() {
    this.baseURL = process.env.VTU_API_BASE_URL || "https://api.vtpass.com";
    this.apiKey = process.env.VTU_API_KEY;
    this.secretKey = process.env.VTU_SECRET_KEY;

    // Network providers mapping
    this.networks = {
      mtn: { name: "MTN", code: "mtn", serviceId: "mtn" },
      glo: { name: "Glo", code: "glo", serviceId: "glo" },
      airtel: { name: "Airtel", code: "airtel", serviceId: "airtel" },
      "9mobile": { name: "9mobile", code: "9mobile", serviceId: "etisalat" },
    };
  }

  // Get available VTU services
  async getAvailableServices() {
    return {
      airtime: {
        name: "Airtime",
        description: "Purchase airtime for any network",
        coinRate: 0.1, // 1 naira = 0.1 coins
        minAmount: 50,
        maxAmount: 10000,
      },
      data: {
        name: "Data",
        description: "Purchase data bundles",
        coinRate: 0.1,
        networks: Object.keys(this.networks),
      },
    };
  }

  // Get network providers
  async getNetworkProviders() {
    return Object.values(this.networks);
  }

  // Get data plans for a network
  async getDataPlans(networkId) {
    try {
      // Mock data plans - in production, fetch from VTU API
      const dataPlans = {
        mtn: [
          {
            id: "mtn-1gb-30",
            name: "1GB - 30 Days",
            price: 350,
            data: "1GB",
            validity: "30 days",
          },
          {
            id: "mtn-2gb-30",
            name: "2GB - 30 Days",
            price: 700,
            data: "2GB",
            validity: "30 days",
          },
          {
            id: "mtn-5gb-30",
            name: "5GB - 30 Days",
            price: 1500,
            data: "5GB",
            validity: "30 days",
          },
          {
            id: "mtn-10gb-30",
            name: "10GB - 30 Days",
            price: 3000,
            data: "10GB",
            validity: "30 days",
          },
        ],
        glo: [
          {
            id: "glo-1gb-30",
            name: "1GB - 30 Days",
            price: 350,
            data: "1GB",
            validity: "30 days",
          },
          {
            id: "glo-2gb-30",
            name: "2GB - 30 Days",
            price: 700,
            data: "2GB",
            validity: "30 days",
          },
          {
            id: "glo-5gb-30",
            name: "5GB - 30 Days",
            price: 1500,
            data: "5GB",
            validity: "30 days",
          },
        ],
        airtel: [
          {
            id: "airtel-1gb-30",
            name: "1GB - 30 Days",
            price: 350,
            data: "1GB",
            validity: "30 days",
          },
          {
            id: "airtel-2gb-30",
            name: "2GB - 30 Days",
            price: 700,
            data: "2GB",
            validity: "30 days",
          },
          {
            id: "airtel-5gb-30",
            name: "5GB - 30 Days",
            price: 1500,
            data: "5GB",
            validity: "30 days",
          },
        ],
        "9mobile": [
          {
            id: "9mobile-1gb-30",
            name: "1GB - 30 Days",
            price: 350,
            data: "1GB",
            validity: "30 days",
          },
          {
            id: "9mobile-2gb-30",
            name: "2GB - 30 Days",
            price: 700,
            data: "2GB",
            validity: "30 days",
          },
        ],
      };

      return dataPlans[networkId] || [];
    } catch (error) {
      console.error("Get data plans error:", error);
      throw new Error("Failed to fetch data plans");
    }
  }

  // Get data plan by ID
  async getDataPlanById(planId) {
    const allPlans = [];
    for (const network of Object.keys(this.networks)) {
      const plans = await this.getDataPlans(network);
      allPlans.push(...plans);
    }
    return allPlans.find((plan) => plan.id === planId);
  }

  // Calculate coin cost for airtime
  async calculateAirtimeCoinCost(amount) {
    const coinRate = 0.1; // 1 naira = 0.1 coins
    return Math.ceil(amount * coinRate);
  }

  // Calculate coin cost for data
  async calculateDataCoinCost(price) {
    const coinRate = 0.1; // 1 naira = 0.1 coins
    return Math.ceil(price * coinRate);
  }

  // Purchase airtime
  async purchaseAirtime({ userId, phoneNumber, amount, network, coinCost }) {
    const session = await Transaction.startSession();
    session.startTransaction();

    try {
      // Deduct coins from user
      await coinService.spendCoins(
        userId,
        coinCost,
        "airtime_purchase",
        session
      );

      // Create transaction record
      const transaction = new Transaction({
        user: userId,
        type: "vtu_airtime",
        amount: coinCost,
        status: "pending",
        metadata: {
          phoneNumber,
          airtimeAmount: amount,
          network,
          service: "airtime",
        },
      });

      await transaction.save({ session });

      // Call VTU API
      const vtuResponse = await this.callVTUAPI("airtime", {
        serviceID: this.networks[network]?.serviceId || network,
        amount,
        phone: phoneNumber,
        request_id: transaction._id.toString(),
      });

      // Update transaction status
      transaction.status = vtuResponse.success ? "completed" : "failed";
      transaction.metadata.vtuResponse = vtuResponse;
      transaction.metadata.externalTransactionId = vtuResponse.requestId;

      await transaction.save({ session });

      // If failed, refund coins
      if (!vtuResponse.success) {
        await coinService.addCoins(userId, coinCost, "airtime_refund", session);
        throw new Error(vtuResponse.message || "Airtime purchase failed");
      }

      await session.commitTransaction();

      return {
        transactionId: transaction._id,
        status: "completed",
        phoneNumber,
        amount,
        network,
        coinsSpent: coinCost,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Purchase data
  async purchaseData({
    userId,
    phoneNumber,
    planId,
    network,
    dataPlan,
    coinCost,
  }) {
    const session = await Transaction.startSession();
    session.startTransaction();

    try {
      // Deduct coins from user
      await coinService.spendCoins(userId, coinCost, "data_purchase", session);

      // Create transaction record
      const transaction = new Transaction({
        user: userId,
        type: "vtu_data",
        amount: coinCost,
        status: "pending",
        metadata: {
          phoneNumber,
          dataPlan,
          network,
          service: "data",
        },
      });

      await transaction.save({ session });

      // Call VTU API
      const vtuResponse = await this.callVTUAPI("data", {
        serviceID: `${this.networks[network]?.serviceId || network}-data`,
        billersCode: phoneNumber,
        variation_code: planId,
        phone: phoneNumber,
        request_id: transaction._id.toString(),
      });

      // Update transaction status
      transaction.status = vtuResponse.success ? "completed" : "failed";
      transaction.metadata.vtuResponse = vtuResponse;
      transaction.metadata.externalTransactionId = vtuResponse.requestId;

      await transaction.save({ session });

      // If failed, refund coins
      if (!vtuResponse.success) {
        await coinService.addCoins(userId, coinCost, "data_refund", session);
        throw new Error(vtuResponse.message || "Data purchase failed");
      }

      await session.commitTransaction();

      return {
        transactionId: transaction._id,
        status: "completed",
        phoneNumber,
        dataPlan,
        network,
        coinsSpent: coinCost,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Call VTU API
  async callVTUAPI(service, data) {
    try {
      // Mock VTU API response for development
      if (process.env.NODE_ENV === "development") {
        return {
          success: true,
          message: "Transaction successful",
          requestId: `mock_${Date.now()}`,
          data: {
            ...data,
            status: "delivered",
          },
        };
      }

      const response = await axios.post(
        `${this.baseURL}/api/pay`,
        {
          ...data,
          api_key: this.apiKey,
          secret_key: this.secretKey,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return {
        success: response.data.code === "000",
        message: response.data.response_description,
        requestId: response.data.requestId,
        data: response.data,
      };
    } catch (error) {
      console.error("VTU API call error:", error);
      return {
        success: false,
        message:
          error.response?.data?.response_description ||
          "VTU service unavailable",
        error: error.message,
      };
    }
  }

  // Get user transaction history
  async getUserTransactionHistory(userId, { page, limit, type }) {
    const query = { user: userId };

    if (type) {
      query.type = type.startsWith("vtu_") ? type : `vtu_${type}`;
    } else {
      query.type = { $in: ["vtu_airtime", "vtu_data"] };
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("user", "username email");

    const total = await Transaction.countDocuments(query);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get transaction details
  async getTransactionDetails(transactionId, userId) {
    return await Transaction.findOne({
      _id: transactionId,
      user: userId,
      type: { $in: ["vtu_airtime", "vtu_data"] },
    }).populate("user", "username email");
  }

  // Admin: Get all VTU transactions
  async getAllTransactions({ page, limit, status, type }) {
    const query = { type: { $in: ["vtu_airtime", "vtu_data"] } };

    if (status) query.status = status;
    if (type) query.type = type.startsWith("vtu_") ? type : `vtu_${type}`;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("user", "username email");

    const total = await Transaction.countDocuments(query);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get VTU analytics
  async getVTUAnalytics() {
    const [
      totalTransactions,
      completedTransactions,
      failedTransactions,
      totalCoinsSpent,
      airtimeTransactions,
      dataTransactions,
      recentTransactions,
    ] = await Promise.all([
      Transaction.countDocuments({
        type: { $in: ["vtu_airtime", "vtu_data"] },
      }),
      Transaction.countDocuments({
        type: { $in: ["vtu_airtime", "vtu_data"] },
        status: "completed",
      }),
      Transaction.countDocuments({
        type: { $in: ["vtu_airtime", "vtu_data"] },
        status: "failed",
      }),
      Transaction.aggregate([
        {
          $match: {
            type: { $in: ["vtu_airtime", "vtu_data"] },
            status: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.countDocuments({ type: "vtu_airtime" }),
      Transaction.countDocuments({ type: "vtu_data" }),
      Transaction.find({ type: { $in: ["vtu_airtime", "vtu_data"] } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "username email"),
    ]);

    // Network distribution
    const networkStats = await Transaction.aggregate([
      {
        $match: {
          type: { $in: ["vtu_airtime", "vtu_data"] },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$metadata.network",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Monthly trends
    const monthlyTrends = await Transaction.aggregate([
      {
        $match: {
          type: { $in: ["vtu_airtime", "vtu_data"] },
          status: "completed",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    return {
      overview: {
        totalTransactions,
        completedTransactions,
        failedTransactions,
        successRate:
          totalTransactions > 0
            ? ((completedTransactions / totalTransactions) * 100).toFixed(2)
            : 0,
        totalCoinsSpent: totalCoinsSpent[0]?.total || 0,
      },
      serviceBreakdown: {
        airtime: airtimeTransactions,
        data: dataTransactions,
      },
      networkStats,
      monthlyTrends,
      recentTransactions,
    };
  }
}

module.exports = new VTUService();
