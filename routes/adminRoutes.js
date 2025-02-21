const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const {
  getAllUsers,
  deleteUser,
  getKYCRequests,
  updateKYCStatus,
  getAllInvestments
} = require("../controllers/adminController");

// Protect all routes with adminAuth middleware
router.get("/users", adminAuth, getAllUsers);
router.delete("/users/:userId", adminAuth, deleteUser);
router.get("/kyc-requests", adminAuth, getKYCRequests);
router.patch("/kyc/:userId", adminAuth, updateKYCStatus);
router.get("/investments", adminAuth, getAllInvestments);

module.exports = router;