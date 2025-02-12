const User = require("../models/User");

exports.getUserDashboard = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const userId = req.user.id;
    const user = await User.findById(userId).populate("investments");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const totalInvestments = user.investments.length || 0;

    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone || "Not Provided",
      kycVerified: user.kycVerified || false,
      totalInvestments,
      investments: user.investments.map((investment) => ({
        id: investment._id,
        plan: investment.plan,
        amount: investment.amount,
        startDate: investment.startDate,
        maturityDate: investment.maturityDate,
        expectedReturns: investment.expectedReturns, // Already calculated in Schema
        status: investment.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching user dashboard:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};