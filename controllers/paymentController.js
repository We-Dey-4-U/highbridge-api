//const Payment = require("../models/Payment");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");

// Helper function to fetch 'got'
const fetchGot = async () => {
  const { default: got } = await import('got');
  return got;
};



// Initiate Flutterwave Payment
exports.initiateFlutterwavePayment = async (req, res) => {
  try {
      console.log("Request received to initiate Flutterwave payment:", req.body);

      // Extract required fields
      const { amount, plan } = req.body;
      if (!amount || !plan) {
          return res.status(400).json({ message: "Amount and plan are required." });
      }

      // Generate a unique transaction reference
      const tx_ref = uuidv4();
      const user = await User.findById(req.user.userId);

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      // Initiate payment request to Flutterwave
      const got = await fetchGot();
      const response = await got.post("https://api.flutterwave.com/v3/payments", {
          headers: {
              Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
              "Content-Type": "application/json",
          },
          json: {
              tx_ref,
              amount,
              currency: "NGN",
              redirect_url: "http://localhost:3000/payment-success",
              customer: {
                  email: user.email,
                  name: user.name,
                  phone: user.phone,
              },
              customizations: {
                  title: "Investment Payment",
                  logo: "http://www.yoursite.com/logo.png",
              },
          },
          responseType: "json",
      });

      console.log("Flutterwave Response:", response.body);

      if (response.body.status === "success") {
          const paymentLink = response.body.data.link;

          // Save investment details
          user.investments.push({
              plan,
              amount,
              tx_ref,
              status: "Pending",
              startDate: new Date(),
              maturityDate: new Date(new Date().setMonth(new Date().getMonth() + 3)), // Example: 3 months later
          });

          await user.save();

          res.json({ message: "Payment link generated successfully", paymentLink });
      } else {
          console.error("Payment initiation failed:", response.body);
          res.status(400).json({ message: "Payment initiation failed", error: response.body });
      }
  } catch (error) {
      console.error("Error creating payment:", error.response?.body || error);
      res.status(500).json({ message: "Internal Server Error", error: error.response?.body || error });
  }
};





// Handle Payment Success
exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { tx_ref, status } = req.query;

    if (status === 'successful') {
      // Verify the transaction with Flutterwave
      const transactionDetails = await verifyTransaction(tx_ref);

      if (!transactionDetails) {
        return res.render('payment-failure');
      }

      // Render the success page with transaction details
      return res.render('payment-success', { transactionDetails });
    } else {
      // Handle unsuccessful payment
      return res.render('payment-failure');
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
    return res.render('error');
  }
};






// Verify Flutterwave Payment
exports.verifyPayment = async (req, res) => {
  try {
      const { tx_ref } = req.query;  // Ensure we use tx_ref
      if (!tx_ref) {
          return res.status(400).json({ message: "Transaction reference is required" });
      }

      // Verify with Flutterwave
      const got = await fetchGot();
      const response = await got.get(`https://api.flutterwave.com/v3/transactions/${tx_ref}/verify`, {
          headers: {
              Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          },
      }).json();

      console.log("Flutterwave Verification Response:", response);

      if (response.status === "success" && response.data.status === "successful") {
          const user = await User.findById(req.user.userId);
          if (!user) {
              return res.status(404).json({ message: "User not found" });
          }

          user.investments.push({
              plan: response.data.meta.plan,
              amount: response.data.amount,
              startDate: new Date(),
              maturityDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
              status: "Active",
              tx_ref,  // Use tx_ref instead of transactionId
          });

          await user.save();
          return res.json({ message: "Investment activated", redirectTo: "/dashboard" });
      } else {
          console.error("Payment verification failed:", response);
          return res.status(400).json({ message: "Payment verification failed", error: response });
      }
  } catch (error) {
      console.error("Error verifying payment:", error.response?.body || error);
      return res.status(500).json({ message: "Payment verification error", error: error.response?.body || error });
  }
};



// Webhook handler
exports.handleWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const hash = crypto.createHmac('sha256', secretHash)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['verif-hash']) {
      return res.status(400).send('Invalid signature');
    }
    const event = req.body;
if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const payment = await Payment.findOneAndUpdate(
        { tx_ref: event.data.tx_ref },  // Ensure consistency
        { status: 'successful', amount: event.data.amount },
        { new: true }
    );

      if (payment) {
        res.status(200).send('Webhook received');
      } else {
        res.status(404).json({ message: 'Payment not found' });
      }
    } else if (event.event === 'charge.failed' || event.event === 'charge.cancelled') {
      const payment = await Payment.findOneAndUpdate(
        { transactionId: event.data.tx_ref },
        { status: event.data.status === 'cancelled' ? 'cancelled' : 'failed' },
        { new: true }
      );

      if (payment) {
        res.status(200).send('Webhook received');
      } else {
        res.status(404).json({ message: 'Payment not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
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