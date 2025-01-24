const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = () => {
  mongoose.connect('mongodb://localhost/reporting', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));
};

module.exports = connectDB;