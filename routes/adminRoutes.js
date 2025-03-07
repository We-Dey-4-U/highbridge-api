const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const {
  getAllUsers,
  deleteUser,
  getKYCRequests,
  updateKYCStatus,
  getAllInvestments,
  approveManualPayment,
  deleteInvestment
} = require("../controllers/adminController");

// Protect all routes with adminAuth middleware
router.get("/users", adminAuth, getAllUsers);
router.delete("/users/:userId", adminAuth, deleteUser);
router.get("/kyc-requests", adminAuth, getKYCRequests);
router.patch("/kyc/:userId", adminAuth, updateKYCStatus);
router.get("/investments", adminAuth, getAllInvestments);
// Admin approves manual payment
router.put("/approve-payment/:investmentId", adminAuth, approveManualPayment);
router.delete("/investments/:investmentId", adminAuth, deleteInvestment);

module.exports = router;