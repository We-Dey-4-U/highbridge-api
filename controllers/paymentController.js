const User = require("../models/User");
const Payment = require("../models/Payment");
const Investment = require("../models/Investment");
const axios = require("axios"); // Import axios for API requests
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();
const { v4: uuidv4 } = require('uuid');
const tx_ref = uuidv4(); // Generates a unique transaction reference

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || "";
const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH || "";

const fetchGot = async () => {
  try {
    const { default: got } = await import("got");
    return got;
  } catch (error) {
    console.error("❌ Error importing got:", error);
    throw error;
  }
};

// **Initiate Flutterwave Payment**

exports.initiateFlutterwavePayment = async (req, res) => {
  try {
    console.log("🚀 Payment initiation route hit!"); // ✅ Check if this appears in the terminal

    if (!req.user) {
      console.log("❌ Unauthorized access attempt.");
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }

    const { amount, plan } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number." });
    }
    if (!plan || typeof plan !== "string" || plan.trim() === "") {
      return res.status(400).json({ message: "Plan is required and must be a valid string." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("❌ User not found:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    const tx_ref = `INVEST-${user._id}-${Date.now()}`;

    // Get plan details
    const planDetails = {
      '6months': { duration: 180, roi: 0.25 },
      '9months': { duration: 270, roi: 0.30 },
      '12months': { duration: 365, roi: 0.50 },
      '18months': { duration: 540, roi: 0.75 }
    };

    const selectedPlan = planDetails[plan];

    if (!selectedPlan) {
      return res.status(400).json({ message: "Invalid plan selected." });
    }

    // Calculate maturity date
    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setDate(maturityDate.getDate() + selectedPlan.duration);

    

    const investment = new Investment({
      user: user._id,
      amount,
      plan,
      tx_ref,
      status: "Pending",
      maturityDate, // ✅ Explicitly setting maturity date
      paymentMethod: "flutterwave", // ✅ Add this field
    });
    
    await investment.save(); // Save to DB first

     // Ensure virtual field is included
     const investmentData = investment.toJSON({ virtuals: true });

     // ✅ Reload investment from DB to ensure expectedReturns is available
     const updatedInvestment = await Investment.findById(investment._id);

    // ✅ Fetch expected return from the saved document
      const expectedReturns = updatedInvestment.expectedReturns || 0;

    const requestBody = {
      tx_ref,
      amount,
      currency: "NGN", // ✅ Changed from "USD" to "NGN"
      redirect_url: "http://localhost:3000/payment-success", // Change for production
      customer: { 
        email: user.email, 
        name: user.name, 
        phone_number: user.phone 
      },
      customizations: { 
        title: "Investment Payment", 
        description: `Plan: ${plan}` 
      },
      expectedReturns, // ✅ Include expectedReturns from the schema
    };

    // Dynamically import got
    const got = await fetchGot();

    // ✅ LOG: Before sending the request
    console.log("📡 Sending request to Flutterwave:", requestBody);

    // Send payment request to Flutterwave
    const response = await got.post("https://api.flutterwave.com/v3/payments", {
      json: requestBody,
      responseType: "json",
      headers: { 
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json" 
      },
    });


    // ✅ LOG: Response from Flutterwave
    console.log("✅ Flutterwave API Response:", response.body);

    // Handle unsuccessful response
    if (response.body.status !== "success") {
      console.error("❌ Flutterwave payment initiation failed:", response.body);
      return res.status(400).json({ message: "Payment initiation failed", error: response.body });
    }

    // Save the payment record
    const payment = new Payment({
      user: user._id,
      investment: investment._id,
      amount,
      currency: "NGN", // ✅ Changed from "USD" to "NGN"
      tx_ref,
      status: "Pending",
    });
    await payment.save();

    res.json({ redirectUrl: response.body.data.link });

  } catch (error) {
    console.error("🚨 Payment Initiation Error:", error);
    res.status(500).json({ message: "Error initiating payment", error });
  }
};




// **Verify Payment**
// **Verify Payment**
exports.verifyPayment = async (req, res) => {
  try {
    const { transaction_id } = req.query;

    if (!transaction_id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` },
    });

    const paymentData = response.data.data;

    if (paymentData.status !== "successful") {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const payment = await Payment.findOne({ tx_ref: paymentData.tx_ref });
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    payment.status = "Completed";
    await payment.save();

    const investment = await Investment.findOne({ tx_ref: payment.tx_ref });
    if (investment) {
      investment.status = "Active";
      await investment.save();
    }

    res.json({ message: "Payment successfully verified", payment });

  } catch (error) {
    console.error("🚨 Error verifying payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// **Webhook Handler**
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["verif-hash"];
    if (!signature || signature !== FLUTTERWAVE_SECRET_HASH) {
      return res.status(401).send("Unauthorized");
    }

    const { data } = req.body;

    if (!data || !data.tx_ref || !data.status) {
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    console.log("🔄 Webhook received:", data);

    const payment = await Payment.findOne({ tx_ref: data.tx_ref });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "Completed") {
      return res.status(200).send("Payment already updated");
    }

    if (data.status === "successful") {
      payment.status = "Completed";
      await payment.save();

      const investment = await Investment.findOne({ tx_ref: data.tx_ref });
      if (investment) {
        investment.status = "Active";
        await investment.save();
      }
    }

    res.status(200).json({ message: "Webhook processed successfully" });

  } catch (error) {
    console.error("❌ Error handling webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Handle Payment Success
exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { tx_ref, status } = req.query;

    if (status === 'successful') {
      // Verify transaction with Flutterwave
      const transactionDetails = await verifyTransaction(tx_ref);

      if (!transactionDetails) {
        return res.render('payment-failure');
      }

      return res.render('payment-success', { transactionDetails });
    } else {
      return res.render('payment-failure');
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
    return res.render('error');
  }
};


// Controller function to get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find();
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller function to update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, amount } = req.body;

    const payment = await Payment.findOneAndUpdate(
      { transactionId: req.params.id }, // Use transactionId for lookup
      { status, amount }, 
      { new: true }
    );

    if (payment) {
      res.status(200).json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller function to cancel payment
exports.cancelPayment = async (req, res) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { transactionId: req.params.id },
      { status: 'cancelled' },
      { new: true }
    );

    if (payment) {
      res.status(200).json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller function to get a payment by ID
exports.getPaymentById = async (req, res) => {
    try {
      const payment = await Payment.findOne({ transactionId: req.params.id });
  
      if (payment) {
        res.status(200).json(payment);
      } else {
        res.status(404).json({ message: 'Payment not found' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };


  





  exports.manualPayment = async (req, res) => {
    try {
        const { amount, plan, receipt } = req.body;
        const userId = req.user.id;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number." });
        }
        if (!plan || typeof plan !== "string" || plan.trim() === "") {
            return res.status(400).json({ message: "Plan is required and must be a valid string." });
        }
        if (!receipt || typeof receipt !== "string") {
            return res.status(400).json({ message: "Receipt is required and must be a valid file URL." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const tx_ref = `MANUAL-${user._id}-${Date.now()}`;

        // Get plan details
        const planDetails = {
            '6months': { duration: 180, roi: 0.25 },
            '9months': { duration: 270, roi: 0.30 },
            '12months': { duration: 365, roi: 0.50 },
            '18months': { duration: 540, roi: 0.75 }
        };

        const selectedPlan = planDetails[plan];

        if (!selectedPlan) {
            return res.status(400).json({ message: "Invalid plan selected." });
        }

        // Calculate maturity date
        const startDate = new Date();
        const maturityDate = new Date(startDate);
        maturityDate.setDate(maturityDate.getDate() + selectedPlan.duration);
        const expectedReturns = amount * (1 + selectedPlan.roi);

        // Create investment record
        const newInvestment = new Investment({
            user: userId,
            plan,
            amount,
            tx_ref,
            paymentMethod: "manual",
            receipt,
            status: "Pending",
            maturityDate,
            expectedReturns,
        });

        await newInvestment.save();

        // Create payment record
        const newPayment = new Payment({
            user: userId,
            investment: newInvestment._id,
            amount,
            currency: "NGN",
            tx_ref,
            status: "Pending",
            paymentMethod: "manual",
            receipt,
        });

        await newPayment.save();

        // Update user document with the investment
        user.investments.push(newInvestment._id);
        await user.save();

        res.status(201).json({
            message: "Manual payment and investment recorded successfully",
            payment: newPayment,
            investment: newInvestment
        });

    } catch (error) {
        console.error("Manual Payment Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};