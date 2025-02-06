const express = require("express");
const { 
    initiateFlutterwavePayment, 
    handleWebhook, 
    verifyPayment, 
    getAllPayments, 
    updatePaymentStatus, 
    cancelPayment, 
    handlePaymentSuccess, 
    getPaymentById // Import the function
  } = require("../controllers/paymentController");
const router = express.Router();

router.post('/initiate-flutterwave-payment', initiateFlutterwavePayment);
router.post('/webhook', handleWebhook);
// Route to verify a payment (updated to use a query parameter)
router.get('/verify', verifyPayment);
router.get('/payments', getAllPayments);
router.get('/payments/:id', getPaymentById);
router.put('/payments/:id/status', updatePaymentStatus);
router.put('/payments/:id/cancel', cancelPayment);
router.get('/payment-success', handlePaymentSuccess);


module.exports = router;