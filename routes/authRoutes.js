const express = require("express");
const { registerUser, loginUser, getUserProfile, updateKYC, verifyKYC } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/user", authMiddleware, getUserProfile); // Add this route
// KYC Update Route (Authenticated users only)
// KYC Routes
router.post("/update-kyc", authMiddleware, updateKYC);
router.post("/admin/verify-kyc", authMiddleware, adminMiddleware, verifyKYC);

module.exports = router;