const Report = require('../models/reportModel');

// Create a new report
exports.createReport = (req, res) => {
  const newReport = new Report(req.body);

  newReport.save()
    .then(() => res.status(200).json({ message: 'Report submitted successfully' }))
    .catch((err) => res.status(400).json({ error: 'Error submitting report', err }));
};

// Get all reports
exports.getAllReports = (req, res) => {
  Report.find()
    .then((reports) => res.status(200).json(reports))
    .catch((err) => res.status(400).json({ error: 'Error fetching reports', err }));
};