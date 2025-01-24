const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Create a new report
router.post('/', reportController.createReport);

// Get all reports
router.get('/', reportController.getAllReports);

module.exports = router;