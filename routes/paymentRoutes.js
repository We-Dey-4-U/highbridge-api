const express = require("express");
const {
    initiateFlutterwavePayment,
    handleWebhook,
    verifyPayment,
    getAllPayments,
    updatePaymentStatus,
    cancelPayment,
    handlePaymentSuccess,
    getPaymentById
} = require("../controllers/paymentController");

const authMiddleware = require("../middleware/authMiddleware"); // Import authentication middleware

const router = express.Router();

// Middleware to log request details (for debugging)
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Secure routes with authentication middleware where necessary
router.post('/initiate-flutterwave-payment', authMiddleware, initiateFlutterwavePayment);
router.get('/verify', authMiddleware, verifyPayment);
router.get('/payments', authMiddleware, getAllPayments);
router.get('/payments/:id', authMiddleware, getPaymentById);
router.put('/payments/:id/status', authMiddleware, updatePaymentStatus);
router.put('/payments/:id/cancel', authMiddleware, cancelPayment);
router.get('/payment-success', handlePaymentSuccess); // Can be public
router.post('/webhook', handleWebhook); // Webhook should be open for Flutterwave to communicate

module.exports = router;