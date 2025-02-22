const User = require("../models/User");
const Investment = require("../models/Investment");

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get KYC requests
// Get KYC requests (only users who have submitted KYC)
exports.getKYCRequests = async (req, res) => {
  try {
    const users = await User.find({
      "kycData.residentialAddress": { $exists: true, $ne: "" }, 
      "kycData.dateOfBirth": { $exists: true, $ne: "" }, 
      "kycData.nationality": { $exists: true, $ne: "" }, 
      "kycData.maritalStatus": { $exists: true, $ne: "" }, 
      "kycData.occupation": { $exists: true, $ne: "" }, 
      kycVerified: false  // Exclude already verified users
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching KYC requests:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Approve or Reject KYC
exports.updateKYCStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // Expected "approved" or "rejected"

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(userId, { kycVerified: status === "approved" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: `KYC ${status}`, user });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all investments
exports.getAllInvestments = async (req, res) => {
  try {
    const investments = await Investment.find().populate("user", "name email");
    res.status(200).json(investments);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};