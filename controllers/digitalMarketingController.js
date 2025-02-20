const DigitalMarketing = require("../models/digitalMarketingModel");

// Register for training
const registerTraining = async (req, res) => {
  const { name, email, mobile, address, knowledge } = req.body;

  try {
    const newEntry = new DigitalMarketing({ name, email, mobile, address, knowledge });
    const savedEntry = await newEntry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all registrations
const getAllRegistrations = async (req, res) => {
  try {
    const registrations = await DigitalMarketing.find();
    res.status(200).json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerTraining, getAllRegistrations };
