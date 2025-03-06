const multer = require('multer');
const path = require('path');
const StaffReport = require('../models/StaffReport'); // Ensure correct path

// Configure Multer storage (Save to 'uploads' folder)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// Only accept image files from camera
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

// Update `createStaffReport` to include image upload
exports.createStaffReport = async (req, res) => {
    try {
        const { branch, name, email, mobileNumber, privateNote, timeIn, timeOut } = req.body;
        const image = req.file?.path; // Get uploaded image path

        if (!image) {
            return res.status(400).json({ message: 'Image is required! Capture your photo.' });
        }

        // Format today's date
        const today = new Date();
        const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

        // Prevent multiple reports per user per day
        const userCount = await StaffReport.countDocuments({ date: formattedDate, name, email });
        if (userCount >= 1) {
            return res.status(400).json({ message: 'You have already registered today.' });
        }

        // Assign serial number
        const todayCount = await StaffReport.countDocuments({ date: formattedDate });
        const sn = todayCount + 1;

        const newStaffReport = new StaffReport({
            sn,
            branch,
            name,
            email,
            mobileNumber,
            privateNote,
            date: formattedDate,
            timeIn,
            timeOut,
            image, // Save image path
        });

        await newStaffReport.save();
        res.status(201).json({ message: 'Staff report created successfully!', data: newStaffReport });
    } catch (error) {
        res.status(500).json({ message: 'Error creating staff report', error: error.message });
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
