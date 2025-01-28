
// Create a new staff report
const StaffReport = require('../models/StaffReport');

// Create a new staff report
exports.createStaffReport = async (req, res) => {
    try {
      const { sn, branch, name, email, mobileNumber, privateNote, date, timeIn, timeOut } = req.body;

      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const isAfter6PM = currentHour >= 18;

      // Allow setting timeOut only after 6 PM and store it
      const finalTimeOut = isAfter6PM ? timeOut : undefined; // Only accept timeOut after 6 PM

      const newStaffReport = new StaffReport({
        sn,
        branch,
        name,
        email,
        mobileNumber,
        privateNote,
        date,
        timeIn,
        timeOut: finalTimeOut // Save timeOut only if it's after 6 PM
      });

      await newStaffReport.save();
      res.status(201).json({ message: 'Staff report created successfully!', data: newStaffReport });
    } catch (error) {
      res.status(400).json({ message: 'Error creating staff report', error: error.message });
    }
};



// Get all staff reports
exports.getAllStaffReports = async (req, res) => {
  try {
    const staffReports = await StaffReport.find();
    res.status(200).json(staffReports);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching staff reports', error: error.message });
  }
};

// Get a single staff report by ID
exports.getStaffReportById = async (req, res) => {
  try {
    const staffReport = await StaffReport.findById(req.params.id);
    if (!staffReport) {
      return res.status(404).json({ message: 'Staff report not found' });
    }
    res.status(200).json(staffReport);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching staff report', error: error.message });
  }
};

// Update a staff report by ID
exports.updateStaffReport = async (req, res) => {
  try {
    const staffReport = await StaffReport.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!staffReport) {
      return res.status(404).json({ message: 'Staff report not found' });
    }
    res.status(200).json({ message: 'Staff report updated successfully!', data: staffReport });
  } catch (error) {
    res.status(400).json({ message: 'Error updating staff report', error: error.message });
  }
};

// Delete a staff report by ID
exports.deleteStaffReport = async (req, res) => {
  try {
    const staffReport = await StaffReport.findByIdAndDelete(req.params.id);
    if (!staffReport) {
      return res.status(404).json({ message: 'Staff report not found' });
    }
    res.status(200).json({ message: 'Staff report deleted successfully!' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting staff report', error: error.message });
  }
};
