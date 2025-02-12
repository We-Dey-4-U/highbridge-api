const User = require("../models/User");
const Payment = require("../models/Payment");
const Investment = require("../models/Investment");
const axios = require("axios"); // Import axios for API requests
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET;
const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH;

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

    // Create pending investment
    const investment = new Investment({
      user: user._id,
      investment: investment._id,
      amount,
      plan,
      tx_ref,
      status: "Pending",
    });
    await investment.save();

    const requestBody = {
      tx_ref,
      amount,
      currency: "USD",
      redirect_url: "http://localhost:3000/payment-success", // Change for production
      customer: { email: user.email },
      customizations: { title: "Investment Payment", description: `Plan: ${plan}` },
    };

    // Dynamically import got
    const got = await fetchGot();

    // ✅ LOG: Before sending the request
    console.log("📡 Sending request to Flutterwave:", requestBody);

    // Send payment request to Flutterwave
    const response = await got.post("https://api.flutterwave.com/v3/payments", {
      json: requestBody,
      responseType: "json",
      headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}`, "Content-Type": "application/json" },
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
      console.log("❌ Transaction reference missing.");
      return res.status(400).json({ message: "Transaction reference is required" });
    }

    // Fetch got dynamically
    const got = await fetchGot();


    console.log(`🔍 Verifying payment for tx_ref: ${tx_ref}`);

    const response = await axios.got(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      {
        headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}` },
      }
    );

    console.log("🔍 Flutterwave Payment Verification Response:", response.data);

    if (response.data.status !== "success") {
      console.error("❌ Payment verification failed with Flutterwave:", response.data);
      return res.status(400).json({ message: "Failed to verify payment with Flutterwave" });
    }

    const paymentData = response.data.data;
    if (!paymentData || paymentData.status !== "successful") {
      console.warn("⚠️ Payment was not successful:", paymentData);
      return res.status(400).json({ message: "Payment was not successful" });
    }

    const payment = await Payment.findOne({ tx_ref });
    if (!payment) {
      console.error("❌ Payment record not found in database for:", tx_ref);
      return res.status(404).json({ message: "Payment record not found" });
    }

    if (payment.status === "Completed") {
      console.log("✅ Payment already verified:", tx_ref);
      return res.json({ message: "Payment already verified" });
    }

    // Mark payment as completed
    payment.status = "Completed";
    payment.amount_paid = paymentData.amount;
    await payment.save();

    await Investment.findByIdAndUpdate(payment.investment, { status: "Active" });

    console.log("🎉 Payment verified and investment activated:", tx_ref);
    res.json({ message: "Payment verified and investment activated" });
  } catch (error) {
    console.error("🚨 Error verifying payment:", error);
    res.status(500).json({ message: "Error verifying payment" });
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

