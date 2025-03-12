const express = require("express");
const { registerRealtor } = require("../controllers/realtorController"); // ❌ Removed getAllRealtors

const router = express.Router();

router.post("/register", registerRealtor);

// ❌ Removed: router.get("/realtors", getAllRealtors);

module.exports = router;