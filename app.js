require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require('path'); // Add this line

// Import route files
const reportRoutes = require("./routes/reportRoutes");
const energyInventoryRoutes = require("./routes/energyInventoryRoutes");
const staffReportRoutes = require("./routes/staffReportRoutes");
const realtorRoutes = require("./routes/realtorRoutes");
const digitalMarketingRoutes = require("./routes/digitalMarketingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const investmentRoutes = require("./routes/investmentRoutes"); // New investment route
const adminRoutes = require("./routes/adminRoutes");






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
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // Exit if the database connection fail
  });


  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes setup
app.use("/api/reports", reportRoutes);
app.use("/api/energy-inventory", energyInventoryRoutes);
app.use("/api/staff-reports", staffReportRoutes);
app.use("/api/realtors", realtorRoutes);
app.use("/api/digital-marketing", digitalMarketingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/investments", investmentRoutes); // Register investment routes
app.use("/api/admin", adminRoutes);



// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// Port setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
