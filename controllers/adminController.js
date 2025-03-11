const User = require("../models/User");
const Investment = require("../models/Investment");
const Payment = require("../models/Payment");
const { sendEmail } = require("../config/emailService");

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








exports.approveManualPayment = async (req, res) => {
  try {
    const { investmentId } = req.params;

    // Ensure the user is an admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Admins only" });
    }

    // Find the investment record
    const investment = await Investment.findById(investmentId).populate("user");
    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
    }

    // Find the corresponding payment record
    const payment = await Payment.findOne({ investment: investmentId });
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    // Ensure it's a manual payment
    if (investment.paymentMethod !== "manual") {
      return res.status(400).json({ message: "Only manual payments can be approved manually" });
    }

    // Update investment and payment status
    investment.status = "Active";
    await investment.save();

    payment.status = "Completed";
    await payment.save();

    // Send email notification to the user
    const emailSubject = "Payment Approved - Investment Activated";
    const emailBody = `
      <h3>Dear ${investment.user.name},</h3>
<p>We are pleased to inform you that your manual payment of <strong>${payment.amount}</strong> for your Highbridge Agrovest investment has been successfully approved.</p>
<p>Your investment is now active, and you can monitor its progress in your dashboard.</p>
<p>Thank you for choosing Highbridge Agrovest. We appreciate your trust in us and look forward to helping you achieve your financial goals.</p>
<br>
<p>Best regards,</p>
<p><strong>Highbridge Agrovest</strong></p>
    `;

    await sendEmail(investment.user.email, emailSubject, emailBody);

    res.status(200).json({
      message: "Manual payment approved successfully. Email sent to user.",
      investment,
      payment,
    });
  } catch (error) {
    console.error("Error approving manual payment:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};




exports.deleteInvestment = async (req, res) => {
  try {
    const { investmentId } = req.params;

    const investment = await Investment.findById(investmentId);
    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
    }

    console.log("Investment Found:", investment); // Debugging

    // Ensure createdAt is properly parsed
    const createdAt = new Date(investment.createdAt);
    const currentTime = new Date();

    console.log("Investment Created At:", createdAt.toISOString()); // Debugging
    console.log("Current Time:", currentTime.toISOString()); // Debugging

    const timeElapsed = (currentTime - createdAt) / (1000 * 60 * 60); // Convert to hours
    console.log(`Time Elapsed: ${timeElapsed} hours`); // Debugging

    // Check if payment was not made within 24 hours for manual payments
    if (investment.paymentMethod === "manual" && investment.status === "Pending") {
      if (timeElapsed >= 24) {
        await Investment.findByIdAndDelete(investmentId);
        return res.status(200).json({ message: "Investment deleted due to unpaid manual payment" });
      } else {
        return res.status(400).json({ message: `Investment cannot be deleted yet, only ${timeElapsed.toFixed(2)} hours have passed` });
      }
    }

    res.status(400).json({ message: "Only pending manual investments can be deleted after 24 hours" });
  } catch (error) {
    console.error("Error deleting investment:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};