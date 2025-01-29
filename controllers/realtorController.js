const Realtor = require("../models/Realtor");
const { sendEmail } = require("../config/emailService");

// Generate unique referral code
const generateReferralCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Register a new realtor
exports.registerRealtor = async (req, res) => {
  try {
    const { name, email, username, mobileNo, gender, dob, address, bankName, accountName, accountNumber, referralCode } = req.body;

    // Check if email or username already exists
    const existingRealtor = await Realtor.findOne({ $or: [{ email }, { username }] });
    if (existingRealtor) {
      return res.status(400).json({ message: "Email or Username already exists" });
    }

    // Generate a new referral code
    const newReferralCode = generateReferralCode();

    // Check if referral code exists
    let referredBy = null;
    if (referralCode) {
      const referrer = await Realtor.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({ message: "Invalid referral code" });
      }
      referredBy = referrer._id;
    }

    // Create realtor
    const newRealtor = new Realtor({
      name, email, username, mobileNo, gender, dob, address, bankName, accountName, accountNumber,
      referralCode: newReferralCode,
      referredBy
    });

    await newRealtor.save();

    // Send confirmation email
    const emailContent = `
      <h3>Welcome, ${name}!</h3>
      <p>You have successfully registered as a realtor at highbridgehomesltd.</p>
      <p>Your referral code: <strong>${newReferralCode}</strong></p>
    `;
    await sendEmail(email, "Realtor Registration Successful", emailContent);

    res.status(201).json({ message: "Registration successful! Check your email.", realtor: newRealtor });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get all realtors (for admin)
exports.getAllRealtors = async (req, res) => {
  try {
    const realtors = await Realtor.find().populate("referredBy", "name email");
    res.json(realtors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching realtors", error });
  }
};