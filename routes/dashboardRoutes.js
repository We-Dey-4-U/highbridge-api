const express = require("express");
const { getUserDashboard } = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getUserDashboard);

module.exports = router;