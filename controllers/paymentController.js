const User = require("../models/User");
const Payment = require("../models/Payment");
const Investment = require("../models/Investment");
const axios = require("axios"); // Import axios for API requests
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

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
      '6m': { duration: 180, roi: 0.25 },
      '9m': { duration: 270, roi: 0.30 },
      '12m': { duration: 365, roi: 0.50 },
      '18m': { duration: 540, roi: 0.75 }
    };

    const selectedPlan = planDetails[plan];

    if (!selectedPlan) {
      return res.status(400).json({ message: "Invalid plan selected." });
    }

    // Calculate maturity date
    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setDate(maturityDate.getDate() + selectedPlan.duration);

    

    // Create pending investment
    const investment = new Investment({
      user: user._id,
      amount,
      plan,
      tx_ref,
      status: "Pending",
      maturityDate, // ✅ Explicitly setting maturity date
      
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
exports.verifyPayment = async (req, res) => {
  try {
      const { tx_ref } = req.query;
      
      if (!tx_ref) {
          return res.status(400).json({ error: 'Transaction reference is required' });
      }

      const payment = await Payment.findOne({ tx_ref });
      if (!payment) {
          return res.status(404).json({ error: 'Payment not found' });
      }

      const flutterwaveResponse = await got.get(`https://api.flutterwave.com/v3/transactions/${tx_ref}/verify`, {
          headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
      });

      if (flutterwaveResponse.data.status === 'success') {
          payment.status = 'successful';
      } else {
          payment.status = 'failed';
      }
      
      await payment.save();
      res.json(payment);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};





// **Webhook Handler**
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["verif-hash"];
    if (!signature) return res.status(400).send("Signature missing");

    const computedSignature = crypto.createHmac("sha256", FLUTTERWAVE_SECRET_HASH)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(computedSignature, "utf8"))) {
      return res.status(400).send("Invalid signature");
    }

    const { tx_ref, status, amount } = req.body.data;
    let payment = await Payment.findOne({ tx_ref });
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    if (status === "successful") {
      payment.status = "Completed";
      payment.amount_paid = amount;
      await payment.save();

      await Investment.findByIdAndUpdate(payment.investment, { status: "Active" });
      return res.status(200).send("Payment confirmed");
    }

    if (status === "failed" || status === "cancelled") {
      payment.status = status;
      await payment.save();
      return res.status(200).send("Payment failed/cancelled");
    }

    res.status(400).json({ message: "Unhandled event type" });

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ message: "Error processing webhook" });
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

