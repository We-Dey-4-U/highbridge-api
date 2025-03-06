const express = require('express');
const router = express.Router();
const staffReportController = require('../controllers/staffReportController');
const multer = require('multer');

// Set up Multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

router.post('/staff-reports', upload.single('image'), staffReportController.createStaffReport);

// Get all staff reports
router.get('/staff-reports', staffReportController.getAllStaffReports);

// Get a staff report by ID
router.get('/staff-reports/:id', staffReportController.getStaffReportById);

// Update a staff report by ID
router.put('/staff-reports/:id', staffReportController.updateStaffReport);

// Delete a staff report by ID
router.delete('/staff-reports/:id', staffReportController.deleteStaffReport);

module.exports = router;