const express = require("express");
const { registerUser, loginUser, getUserProfile, updateKYC,forgotPassword,resetPassword } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/user", authMiddleware, getUserProfile); // Add this routerouter.put("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// KYC Update Route (Authenticated users only)
// KYC Routes
router.post("/update-kyc", authMiddleware, updateKYC);


module.exports = router;