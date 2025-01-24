const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const reportRoutes = require('./routes/reportRoutes');  // Import the report routes

const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());  // Parse JSON bodies

// Database connection (MongoDB)
mongoose.connect('mongodb+srv://test:test@cluster0.2h6vcur.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0', {
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

// Port setup
const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});