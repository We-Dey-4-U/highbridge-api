const User = require("../models/User");
const Investment = require("../models/Investment");

exports.getUserDashboard = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const userId = req.user.id;

    // Fetch user details (excluding password)
    const user = await User.findById(userId).select("name email phone kycVerified");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch user's investments & sort by startDate (newest first)
    const investments = await Investment.find({ user: userId })
      .select("plan amount startDate maturityDate expectedReturns status")
      .sort({ startDate: -1 });

    // Calculate total invested amount
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.amount, 0);

    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone || "Not Provided",
      kycVerified: user.kycVerified || false,
      totalInvestments,
      investments, // Directly return investments without unnecessary mapping
    });
  } catch (error) {
    console.error("Error fetching user dashboard:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};