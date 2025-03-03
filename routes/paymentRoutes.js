const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
    initiateFlutterwavePayment,
    handleWebhook,
    verifyPayment,
    getAllPayments,
    updatePaymentStatus,
    cancelPayment,
    handlePaymentSuccess,
    manualPayment,
    getPaymentById
} = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware"); // Authentication middleware

const router = express.Router();

// Middleware to log request details (for debugging)
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Define upload directory
const uploadDir = path.join(__dirname, "../uploads/receipts");

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Store files in the receipts directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

// File filter to accept only valid image/PDF formats
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
    }
};

// Set Multer upload settings
const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file limit
});

// Secure routes with authentication middleware where necessary
router.post('/initiate-flutterwave-payment', authMiddleware, initiateFlutterwavePayment);
router.get('/verify', authMiddleware, verifyPayment);
router.get('/payments', authMiddleware, getAllPayments);
router.get('/payments/:id', authMiddleware, getPaymentById);
router.put('/payments/:id/status', authMiddleware, updatePaymentStatus);
router.put('/payments/:id/cancel', authMiddleware, cancelPayment);
router.get('/payment-success', handlePaymentSuccess);
router.post('/webhook', handleWebhook); // Webhook should be open for Flutterwave

// ✅ Manual Payment Route with File Upload Handling
router.post("/manual-payment", authMiddleware, upload.single("receipt"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Receipt file is required." });
        }

        const receiptUrl = `/uploads/receipts/${req.file.filename}`; // Adjust to match your file serving path

        // Pass the receipt URL instead of the file object
        req.body.receipt = receiptUrl;

        await manualPayment(req, res); // Call your controller function with updated receipt URL
    } catch (error) {
        console.error("Manual Payment Upload Error:", error);
        res.status(500).json({ message: "Error processing payment", error: error.message });
    }
});
module.exports = router;