const mongoose = require('mongoose');

// Define the report schema
const reportSchema = new mongoose.Schema({
  staffName: { type: String, required: true },
  date: { type: Date, required: true },
  department: { type: String, required: true },
  taskAccomplished: { type: String, required: true },
  issues: { type: String, required: true },
  pendingTasks: { type: String, required: true },
});

// Create a Report model based on the schema
const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
