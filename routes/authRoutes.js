const express = require("express");
const { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    getUserInvestments, 
    addInvestment, 
    verifyKYC // Add this function
  } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/user", authMiddleware, getUserProfile); // Add this route
router.post("/user/kyc/:userId", authMiddleware, verifyKYC); // Add KYC verification route

module.exports = router;