require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const reportRoutes = require("./routes/reportRoutes");
const energyInventoryRoutes = require("./routes/energyInventoryRoutes");
const staffReportRoutes = require("./routes/staffReportRoutes");
const realtorRoutes = require("./routes/realtorRoutes");
const digitalMarketingRoutes = require("./routes/digitalMarketingRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); // Ensure this is properly imported

const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Database connection
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Routes setup
app.use("/api/reports", reportRoutes);
app.use("/api/energy-inventory", energyInventoryRoutes);
app.use("/api", staffReportRoutes);
app.use("/api/realtors", realtorRoutes);
app.use("/api/digital-marketing", digitalMarketingRoutes);
app.use("/api/payments", paymentRoutes); // Ensure payments route is added

// Port setup
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});