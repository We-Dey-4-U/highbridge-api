const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../config/emailService");
const multer = require("multer");
const path = require("path");


// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: "./uploads/kyc-docs/",
  filename: (req, file, cb) => {
    const filename = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    console.log("[UPLOAD] Saving file as:", filename);
    cb(null, filename);
  }
});

const upload = multer({ storage }).fields([
  { name: "idDocumentImage", maxCount: 1 },
  { name: "passportImage", maxCount: 1 },
  { name: "signatureImage", maxCount: 1 } // Added signatureImage
]);

// Middleware to validate KYC fields
const validateKYCData = (data) => {
  const requiredFields = ["residentialAddress", "dateOfBirth", "nationality", "maritalStatus", "occupation"];
  const isValid = requiredFields.every(field => data[field] && data[field].trim() !== "");
  if (!isValid) console.error("[VALIDATION ERROR] Missing required fields:", data);
  return isValid;
};


// **Register User**
exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, referralCode, role } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Check if there's already an admin
    const existingAdmin = await User.findOne({ role: "admin" });

    let userRole = "user";
    if (role === "admin") {
      if (existingAdmin) {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({ message: "Only admins can create new admins" });
        }
      } else {
        userRole = "admin"; // First registered admin
      }
    }

    // **Handle Referral System**
    let referer = null;
    if (referralCode) {
      const referringUser = await User.findOne({ referralCode });
      if (referringUser) {
        referer = referringUser.name; // Save referer’s name
      } else {
        return res.status(400).json({ message: "Invalid referral code" });
      }
    }

    // **Generate a unique referral code if not provided**
    const generatedReferralCode = Math.floor(1000 + Math.random() * 9000).toString();

    const newUser = new User({
      name,
      email,
      phone,
      password,
      role: userRole,
      kycData: {},
      referralCode: generatedReferralCode, // Auto-generate referral code
      referer, // Store referer's name
    });

    await newUser.save();
    await sendEmail(email, "Welcome!", `<h3>Welcome, ${name}!</h3><p>Your account has been created successfully!</p>`);

    res.status(201).json({ 
      message: "Registration successful", 
      role: newUser.role,
      referralCode: newUser.referralCode, 
      referer: newUser.referer 
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



// **Login User**
// **Login User**
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Log entered credentials for debugging
    console.log(`Entered email: ${email}`);
    console.log(`Entered password: "${password.trim()}"`);
    console.log(`Stored hashed password: "${user.password}"`);

    
    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1y" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
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



// **Update KYC Details**
exports.updateKYC = async (req, res) => {
  console.log("[REQUEST] KYC update request received for user:", req.user.id);
  console.log("[REQUEST BODY]", req.body);

  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error("[UPLOAD ERROR]", err);
        return res.status(400).json({ message: "File upload error", error: err });
      }

      console.log("[UPLOAD SUCCESS] File uploaded successfully:", req.file?.filename || "No file uploaded");

      const userId = req.user.id;
      let updatedKYCData = { ...req.body };

      // Validate required fields
      if (!validateKYCData(req.body)) {
        return res.status(400).json({ message: "Missing required KYC fields" });
      }

      // Validate ID Document Type
      const validIDTypes = ["passport", "driver_license", "national_id"];
      if (!validIDTypes.includes(req.body.idDocumentType)) {
        return res.status(400).json({ message: "Invalid ID document type" });
      }

      // Parse nested JSON fields if they are received as strings
      try {
        updatedKYCData.nextOfKin = typeof req.body.nextOfKin === "string" ? JSON.parse(req.body.nextOfKin) : req.body.nextOfKin || {};
        updatedKYCData.bankDetails = typeof req.body.bankDetails === "string" ? JSON.parse(req.body.bankDetails) : req.body.bankDetails || {};
        updatedKYCData.corporateInfo = typeof req.body.corporateInfo === "string" ? JSON.parse(req.body.corporateInfo) : req.body.corporateInfo || {};
      } catch (e) {
        console.error("[PARSE ERROR] Invalid JSON:", e);
        return res.status(400).json({ message: "Invalid JSON format in KYC data" });
      }

      // Handle uploaded files
      if (req.files?.idDocumentImage) {
        updatedKYCData.idDocumentImage = req.files.idDocumentImage[0].path;
      }

      if (req.files?.passportImage) {
        updatedKYCData.passportImage = req.files.passportImage[0].path;
      }
      if (req.files?.signatureImage) {
        updatedKYCData.signatureImage = req.files.signatureImage[0].path;
      }

      // Clean empty fields
      const cleanData = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== ""));
      updatedKYCData.nextOfKin = cleanData(updatedKYCData.nextOfKin);
      updatedKYCData.bankDetails = cleanData(updatedKYCData.bankDetails);
      updatedKYCData.corporateInfo = cleanData(updatedKYCData.corporateInfo);

      // Update user KYC data
      const user = await User.findByIdAndUpdate(
        userId,
        { kycData: updatedKYCData },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("[SUCCESS] KYC data updated successfully for user:", userId);

      // 🛑 🛑 🛑 SEND EMAIL TO ADMIN 🛑 🛑 🛑
      const adminEmail = "ahighbridge44@gmail.com"; // Change this to the actual admin email
      const emailSubject = "🔔 New KYC Submission";
      const emailBody = `
        <h3>New KYC Submission</h3>
        <p><strong>User:</strong> ${user.name} (${user.email})</p>
        <p><strong>ID Document Type:</strong> ${req.body.idDocumentType}</p>
        <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
        <p>Please review the KYC details in the admin panel.</p>
      `;

      await sendEmail(adminEmail, emailSubject, emailBody);
      console.log("📧 KYC submission email sent to admin");

      res.status(200).json({ message: "KYC Updated Successfully", kyc: user.kycData });
    });
  } catch (error) {
    console.error("[SERVER ERROR] KYC update error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};




// **Change Password**
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex"); // Generate token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour

    await user.save();
    
    const resetLink = `https://mediumspringgreen-quail-602850.hostingersite.com//reset-password/${resetToken}`;
    await sendEmail(user.email, "Reset Password", `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`);

    res.json({ message: "Password reset email sent." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};





// **Reset Password**
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params; // Get token from URL params
    const { newPassword } = req.body; // Get new password from request body

    console.log(`Received password reset request for token: ${token}`);

    // **Validate new password**
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // **Find user by reset token**
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      console.warn("Invalid or expired reset token.");
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // **Check if token has expired**
    if (user.resetPasswordExpires < Date.now()) {
      console.warn(`Expired token for user: ${user.email}`);
      return res.status(400).json({ message: "Token has expired. Please request a new reset link." });
    }

    console.log(`User found: ${user.email}. Proceeding with password reset.`);

    // **Set new password (schema will hash it)**
    user.password = newPassword.trim();

    // **Clear the reset token fields**
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // **Save the user (pre-save middleware will hash the password)**
    await user.save();
    console.log(`Password successfully saved for user: ${user.email}`);

    // **Send confirmation email**
    await sendEmail(user.email, "Password Reset Successful", `<h3>Your password has been successfully reset.</h3>`);

    res.json({ message: "Password has been reset successfully. You can now log in with your new password." });

  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};