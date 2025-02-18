const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../config/emailService");


// **Register User**
// **Register User**
exports.registerUser = async (req, res) => {
  try {
    const {
      name, email, phone, password,
      residentialAddress, dateOfBirth, nationality, maritalStatus, occupation, placeOfWork, workAddress,
      corporateName, corporateAddress, contactName, correspondenceAddress, corporatePhone, corporateEmail,
      nextOfKinName, nextOfKinRelationship, nextOfKinPhone, nextOfKinAddress, nextOfKinDateOfBirth, nextOfKinEmail,
      bankName, accountNumber, accountName,
      referralCode, // The referral code the new user is using (if any)
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !residentialAddress || !dateOfBirth ||
        !nationality || !maritalStatus || !occupation || !placeOfWork || !workAddress ||
        !nextOfKinName || !nextOfKinRelationship || !nextOfKinPhone || !nextOfKinAddress ||
        !nextOfKinDateOfBirth || !nextOfKinEmail || !bankName || !accountNumber || !accountName) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    let referer = null;

    // Check if a valid referral code is provided
    if (referralCode) {
      const referringUser = await User.findOne({ referralCode });
      if (referringUser) {
        referer = referringUser.name; // Store the referer's name
      }
    }

    const newUser = new User({
      name, email, phone, password, // No manual hashing here
      residentialAddress, dateOfBirth, nationality, maritalStatus, occupation, placeOfWork, workAddress,
      corporateName, corporateAddress, contactName, correspondenceAddress, corporatePhone, corporateEmail,
      nextOfKinName, nextOfKinRelationship, nextOfKinPhone, nextOfKinAddress, nextOfKinDateOfBirth, nextOfKinEmail,
      bankName, accountNumber, accountName,
      kycVerified: false,
      investments: [],
      referer,
    });

    await newUser.save();

    await sendEmail(email, "Welcome!", `<h3>Welcome, ${name}!</h3><p>Your registration was successful.</p>`);

    res.status(201).json({ message: "Registration successful." });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};





// **Login User**
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    console.log("Stored Password:", user.password);
    console.log("Entered Password:", password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// **Get User Profile**
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};




exports.verifyKYC = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(userId, { kycVerified: true }, { new: true });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "KYC Verified successfully", user });
  } catch (error) {
    console.error("KYC Verification error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};





