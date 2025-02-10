const User = require("../models/User");

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id; // Get logged-in user ID from middleware
    console.log("Fetching dashboard for user:", userId);
    // Fetch user details excluding password
    const user = await User.findById(userId).select("-password");
    if (!user) {
        console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Customize dashboard response
    const dashboardData = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      investments: user.investments,
      kycVerified: user.kycVerified,
      totalInvestments: user.investments.length,
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching user dashboard:", error);
    res.status(500).json({ message: "Server Error" });
  }
};