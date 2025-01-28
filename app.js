const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const reportRoutes = require('./routes/reportRoutes');  // Import the report routes
const energyInventoryRoutes = require('./routes/energyInventoryRoutes');
const staffReportRoutes = require('./routes/staffReportRoutes');  // Import the staff report routes



const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());  // Parse JSON bodies

// Database connection (MongoDB)
mongoose.connect('mongodb+srv://highbridge:homes2025@cluster0.m6flg.mongodb.net/highbridgehomesltd?retryWrites=true&w=majority&appName=Cluster0', {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Routes setup
app.use('/api/reports', reportRoutes);  // Use the report routes
app.use('/api/energy-inventory', energyInventoryRoutes);
app.use('/api', staffReportRoutes);  // Use the staff report routes

// Port setup
const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});