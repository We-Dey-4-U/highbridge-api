const express = require("express");
const { createInvestment, getInvestments, checkInvestmentMaturity, updateInvestmentStatus  } = require("../controllers/investmentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/add", authMiddleware, createInvestment);
router.get("/", authMiddleware, getInvestments);
router.get("/maturity-check", authMiddleware, checkInvestmentMaturity); // NEW route
router.put("/update-status", authMiddleware, updateInvestmentStatus);

module.exports = router;