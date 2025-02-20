const mongoose = require('mongoose');

// Define the schema for the staff report
const staffReportSchema = new mongoose.Schema({
    sn: {
      type: Number,
      required: false, // No longer required since it's assigned automatically
    },
    branch: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensuring the email is unique
    },
    mobileNumber: {
      type: String, // Changed from Number to String for flexibility
      required: true,
      validate: {
        validator: function (value) {
          // A regex to validate Nigerian mobile numbers (e.g., 07012345678)
          return /^(0|\+234)[7-9][0-1]\d{8}$/.test(value);
        },
        message: (props) => `${props.value} is not a valid Nigerian mobile number!`,
      },
    },
    privateNote: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeIn: {
      type: String,
      required: true,
    },
    timeOut: {
      type: String,
    },
}, { timestamps: true });

// Create and export the StaffReport model
const StaffReport = mongoose.model('StaffReport', staffReportSchema);

module.exports = StaffReport;
