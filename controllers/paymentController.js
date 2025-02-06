const Payment = require("../models/Payment");
const { v4: uuidv4 } = require("uuid");

// Helper function to fetch 'got'
const fetchGot = async () => {
  const { default: got } = await import('got');
  return got;
};



exports.initiateFlutterwavePayment = async (req, res) => {
    try {
      console.log('Request received to initiate Flutterwave payment:', req.body);
  
      // Validate that required fields are present in the request body
      const { amount, email, name, phone, plan } = req.body;
  
      if (!amount || !email || !name || !phone || !plan) {
        return res.status(400).json({ message: 'Missing required fields: amount, email, name, phone, and plan are required.' });
      }
  
      // Generate a unique transaction reference
      const tx_ref = uuidv4();
  
      // Create a new payment record with tx_ref
      const newPayment = new Payment({
        name,
        email,
        phone,
        plan,
        amount,
        tx_ref, // Save the generated tx_ref in the payment record
        status: 'pending', // Set the status to 'pending' initially
      });
  
      console.log('Saving new payment:', newPayment);
      const savedPayment = await newPayment.save();
      console.log('Payment saved successfully:', savedPayment);
  
      // Fetch got dynamically
      const got = await fetchGot();
  
      // Initiate Flutterwave payment
      const response = await got.post('https://api.flutterwave.com/v3/payments', {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        json: {
          tx_ref: tx_ref,
          amount: amount,
          currency: 'NGN',
          redirect_url: 'http://localhost:3000/payment-success', // Change to your success URL
          customer: {
            email: email,
            name: name,
            phone: phone
          },
          customizations: {
            title: 'Subscription Payments',
            logo: 'http://www.yourschool.com/logo.png' // Change to your logo URL
          }
        },
        responseType: 'json'
      });
  
      console.log('Flutterwave Response:', response.body); // Log full response body
  
      if (response.body.status === 'success') {
        const paymentLink = response.body.data.link; // Extract the payment link
        console.log('Payment link generated:', paymentLink);
  
        res.json({ message: 'Payment link generated successfully', paymentLink: paymentLink });
      } else {
        console.error('Payment initiation failed:', response.body);
        
        // Update payment status to 'failed'
        savedPayment.status = 'failed';
        await savedPayment.save();
  
        res.status(400).json({ message: 'Payment initiation failed', error: response.body });
      }
    } catch (error) {
      console.error('Error creating payment:', error.response?.body || error);
  
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.response?.body || error
      });
    }
  };






exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { tx_ref, transaction_id, status } = req.query;

    if (status === 'successful') {
      // Verify the transaction
      const transactionDetails = await verifyTransaction(tx_ref, transaction_id);

      // Render payment success page
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

exports.verifyPayment = async (req, res) => {
  try {
    const { transaction_id } = req.query;
    const got = await fetchGot();

    const response = await got.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
      }
    }).json();

    console.log('Flutterwave Verification Response:', response);

    if (response.data.status === "successful") {
      const payment = await Payment.findOneAndUpdate(
        { transactionId: response.data.tx_ref },
        { status: 'successful', amount: response.data.amount }, // Update amount here
        { new: true }
      );

      if (payment) {
        res.status(200).json(payment);
      } else {
        res.status(404).json({ message: 'Payment not found' });
      }
    } else {
      console.error('Payment verification failed:', response);

      const payment = await Payment.findOneAndUpdate(
        { transactionId: response.data.tx_ref },
        { status: response.data.status === "cancelled" ? 'cancelled' : 'failed' },
        { new: true }
      );

      if (payment) {
        res.status(200).json(payment);
      } else {
        res.status(404).json({ message: 'Payment not found' });
      }
    }
  } catch (error) {
    console.error('Error verifying payment:', error.response?.body || error);

    res.status(500).json({
      message: 'Internal Server Error',
      error: error.response?.body || error
    });
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
        { transactionId: event.data.tx_ref },
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