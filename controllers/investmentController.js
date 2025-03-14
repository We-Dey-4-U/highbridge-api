const Investment = require("../models/Investment");
const User = require("../models/User");

// Create a new investment
exports.createInvestment = async (req, res) => {
  try {
      const { plan, amount, tx_ref, paymentMethod, receipt } = req.body;
      const userId = req.user.id;

      if (!plan || !amount || !tx_ref || !paymentMethod) {
          return res.status(400).json({ error: "All fields are required" });
      }

      if (paymentMethod === "manual" && !receipt) {
          return res.status(400).json({ error: "Receipt is required for manual payments" });
      }

      const validPlans = ["6months", "9months", "12months", "18months"];
      if (!validPlans.includes(plan)) {
          return res.status(400).json({ error: "Invalid investment plan" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Get plan details
      const planDurations = {
        "6months": 180,
        "9months": 270,
        "12months": 365,
        "18months": 540,
      };

      const duration = planDurations[plan];
      const startDate = new Date();
      const maturityDate = new Date(startDate);
      maturityDate.setDate(maturityDate.getDate() + duration);

      // Calculate countdown in days
      const countdown = Math.ceil((maturityDate - startDate) / (1000 * 60 * 60 * 24));

      const newInvestment = new Investment({
        user: userId,
        plan,
        amount,
        tx_ref,
        paymentMethod,
        receipt: paymentMethod === "manual" && receipt ? receipt : undefined,
        startDate,
        maturityDate,
        countdown, // Countdown is stored but doesn't start yet
        status: "Pending",
    });

      await newInvestment.save();

      user.investments.push(newInvestment._id);
      await user.save();
      await user.populate("investments");

      res.status(201).json({
          message: "Investment created successfully",
          investment: newInvestment,
      });
  } catch (error) {
      console.error("Error creating investment:", error);
      res.status(500).json({ error: "Server error" });
  }
};

// Fetch user investments
exports.getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.id }).populate("user", "name email");

    const formattedInvestments = investments.map(investment => {
      console.log(`Fetched investment ${investment._id}: Countdown = ${investment.countdown}`);

      return {
        id: investment._id,
        plan: investment.plan,
        amount: investment.amount,
        startDate: investment.startDate,
        maturityDate: investment.maturityDate,
        status: investment.status,
        countdown: investment.countdown, // ✅ Ensure updated countdown is included
        expectedReturn: investment.expectedReturn,
        paymentMethod: investment.paymentMethod
      };
    });

    res.json({ investments: formattedInvestments });
  } catch (error) {
    console.error("❌ Error fetching investments:", error);
    res.status(500).json({ error: "Server error" });
  }
};




// ✅ Check and update investment maturity + countdown
const checkInvestmentMaturity = async () => {
  try {
    console.log("🚀 Running investment maturity check at:", new Date());

    const investments = await Investment.find({ status: "Active" });

    if (investments.length === 0) {
      console.log("✅ No active investments found.");
      return;
    }

    for (let investment of investments) {
      const today = new Date();
      const startDate = new Date(investment.startDate);
      const maturityDate = new Date(investment.maturityDate);

      console.log(`\n🔹 Checking investment ${investment._id}`);
      console.log(`   📌 Start Date: ${startDate}`);
      console.log(`   📌 Maturity Date: ${maturityDate}`);
      console.log(`   📌 Today: ${today}`);

      // ✅ Calculate countdown days
      let daysLeft = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24));
      console.log(`   ⏳ Days Left: ${daysLeft}`);

      // Ensure countdown doesn't go below 0
      let newCountdown = Math.max(daysLeft, 0);
      let newStatus = investment.status;

      if (daysLeft <= 0) {
        newStatus = "Matured";
      }

      console.log(`   🔄 Updating Countdown to: ${newCountdown}, Status to: ${newStatus}`);

      // ✅ Update in MongoDB properly
      const updateResult = await Investment.updateOne(
        { _id: investment._id },
        { $set: { countdown: newCountdown, status: newStatus } }
      );

      console.log(`   ✅ MongoDB Update Result:`, updateResult);
    }

    console.log("✅ Investment maturity check completed.\n");
  } catch (error) {
    console.error("❌ Error updating investment countdown:", error);
  }
};

// ✅ Run function immediately when the server starts
checkInvestmentMaturity();

// ✅ Run every 24 hours
const interval = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
  console.log("⏰ Scheduled checkInvestmentMaturity running...");
  checkInvestmentMaturity();
}, interval);

console.log(`✅ setInterval scheduled to run every ${interval / (1000 * 60 * 60)} hours`);

// ✅ Manually trigger investment maturity check via API
exports.checkInvestmentMaturity = async (req, res) => {
  try {
    console.log("📢 Manual API request to check investment maturity...");
    await checkInvestmentMaturity();
    res.json({ message: "Investment maturity checked successfully." });
  } catch (error) {
    console.error("❌ Error checking maturity:", error);
    res.status(500).json({ error: "Server error" });
  }
};



// ✅ Update Investment Status (e.g., Approve or Reject)
exports.updateInvestmentStatus = async (req, res) => {
  try {
    const { investmentId, status } = req.body;

    if (!["Pending", "Active", "Matured", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ error: "Investment not found" });

    if (status === "Active") {
      const startDate = new Date();
      const maturityDate = new Date(startDate);
      
      const planDurations = {
        "6months": 180,
        "9months": 270,
        "12months": 365,
        "18months": 540,
      };

      if (!planDurations[investment.plan]) {
        return res.status(400).json({ error: "Invalid plan duration" });
      }

      // Set maturity date based on plan duration
      maturityDate.setDate(maturityDate.getDate() + planDurations[investment.plan]);

      // Start countdown immediately
      const countdown = Math.ceil((maturityDate - startDate) / (1000 * 60 * 60 * 24));

      // Update investment fields
      investment.status = "Active";
      investment.startDate = startDate;
      investment.maturityDate = maturityDate;
      investment.countdown = countdown;
    } else if (status === "Matured") {
      investment.countdown = 0;
    }

    investment.status = status;
    await investment.save();

    res.json({ message: "Investment status updated", investment });
  } catch (error) {
    console.error("Error updating investment status:", error);
    res.status(500).json({ error: "Server error" });
  }
};