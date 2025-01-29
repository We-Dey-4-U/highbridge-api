const express = require("express");
const { registerRealtor, getAllRealtors } = require("../controllers/realtorController");

const router = express.Router();

router.post("/register", registerRealtor);
router.get("/realtors", getAllRealtors); // For admin

module.exports = router;