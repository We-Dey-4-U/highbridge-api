const express = require("express");
const { registerTraining, getAllRegistrations } = require("../controllers/digitalMarketingController");

const router = express.Router();

router.post("/register", registerTraining);
router.get("/registrations", getAllRegistrations);

module.exports = router;