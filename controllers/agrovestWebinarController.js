const AgrovestWebinar = require("../models/agrovestWebinar");

exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Simple validation
    if (!name || !email || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Save user to DB
    const newUser = new AgrovestWebinar({ name, email, phone });
    await newUser.save();

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};