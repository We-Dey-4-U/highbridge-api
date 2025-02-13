const Investment = require("../models/Investment");
const User = require("../models/User");

// Create a new investment
exports.createInvestment = async (req, res) => {
  try {
    const { plan, amount, tx_ref } = req.body;
    const userId = req.user.id;

    if (!plan || !amount || !tx_ref) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Ensure the plan is valid
    const validPlans = ["6m", "9m", "12m", "18m"]; // Match schema format
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: "Invalid investment plan" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create the investment
    const newInvestment = new Investment({
      user: userId,
      plan,
      amount,
      tx_ref,
      status: "Pending",
    });

    await newInvestment.save();

    // Add investment to user profile
    user.investments.push(newInvestment._id);
    await user.save();
await user.populate("investments");

    res.status(201).json({
      message: "Investment created successfully",
      investment: {
        id: newInvestment._id,
        plan: newInvestment.plan,
        amount: newInvestment.amount,
        startDate: newInvestment.startDate,
        maturityDate: newInvestment.maturityDate,
        expectedReturns: newInvestment.expectedReturns, // Corrected field name
        status: newInvestment.status,
      },
    });
  } catch (error) {
    console.error("Error creating investment:", error);
    res.status(500).json({ error: "Server error" });
  }
};





// Fetch user investments with expected return
exports.getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.id }).populate("user", "name email");
    console.log("Investments found:", investments);
    const formattedInvestments = investments.map(investment => ({
      id: investment._id,
      plan: investment.plan,
      amount: investment.amount,
      startDate: investment.startDate,
      maturityDate: investment.maturityDate,
      status: investment.status,
      expectedReturn: investment.expectedReturn
    }));

    res.json({ investments: formattedInvestments });
  } catch (error) {
    console.error("Error fetching investments:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Check if investment is matured
exports.checkInvestmentMaturity = async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.id, status: "Active" });

    const maturedInvestments = await Promise.all(
      investments.map(async (investment) => {
        if (new Date() >= investment.maturityDate) {
          investment.status = "Matured";
          return investment.save();
        }
        return null;
      })
    );

    res.json({ maturedInvestments: maturedInvestments.filter(Boolean) });
  } catch (error) {
    console.error("Error checking maturity:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update Investment Status (e.g., Approve or Reject)
exports.updateInvestmentStatus = async (req, res) => {
  try {
    const { investmentId, status } = req.body;

    if (!["Pending", "Active", "Matured", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ error: "Investment not found" });

    investment.status = status;
    await investment.save();

    res.json({ message: "Investment status updated", investment });
  } catch (error) {
    console.error("Error updating investment status:", error);
    res.status(500).json({ error: "Server error" });
  }
};