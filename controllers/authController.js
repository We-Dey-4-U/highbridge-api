const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../config/emailService");
const multer = require("multer");
const path = require("path");

// File Upload Middleware for ID document
// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: "./uploads/kyc-docs/",
  filename: (req, file, cb) => {
    const filename = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    console.log("[UPLOAD] Saving file as:", filename);
    cb(null, filename);
  }
});
const upload = multer({ storage }).single("idDocumentImage");

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
    const { name, email, phone, password, referralCode } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    let referer = null;

    // If a referral code is provided, find the referring user
    if (referralCode) {
      const referringUser = await User.findOne({ referralCode });
      if (referringUser) {
        referer = referringUser.name; // Store referring user's NAME instead of ID
      } else {
        return res.status(400).json({ message: "Invalid referral code" });
      }
    }

    // Create new user with an empty kycData object
    const newUser = new User({
      name,
      email,
      phone,
      password,
      referer,
      kycData: {}, // Ensure kycData field is present even if empty
    });
    await newUser.save();

    await sendEmail(email, "Welcome!", `<h3>Welcome, ${name}!</h3><p>Your account has been created successfully!</p>`);

    res.status(201).json({ 
      message: "Registration successful", 
      referralCode: newUser.referralCode, 
      referer: newUser.referer 
    });
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

    if (!user || !(await user.comparePassword(password))) {
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
      if (typeof req.body.nextOfKin === "string") {
        try {
          updatedKYCData.nextOfKin = JSON.parse(req.body.nextOfKin);
        } catch (e) {
          console.error("[PARSE ERROR] Invalid nextOfKin JSON:", e);
          return res.status(400).json({ message: "Invalid nextOfKin format" });
        }
      }

      if (typeof req.body.bankDetails === "string") {
        try {
          updatedKYCData.bankDetails = JSON.parse(req.body.bankDetails);
        } catch (e) {
          console.error("[PARSE ERROR] Invalid bankDetails JSON:", e);
          return res.status(400).json({ message: "Invalid bankDetails format" });
        }
      }

      if (typeof req.body.corporateInfo === "string") {
        try {
          updatedKYCData.corporateInfo = JSON.parse(req.body.corporateInfo);
        } catch (e) {
          console.error("[PARSE ERROR] Invalid corporateInfo JSON:", e);
          return res.status(400).json({ message: "Invalid corporateInfo format" });
        }
      }

      // Handle file upload
      if (req.file) {
        updatedKYCData.idDocumentImage = req.file.path;
      }

      // Ensure empty fields are cleaned up
      const cleanData = (obj) => {
        return Object.fromEntries(
          Object.entries(obj).filter(([_, v]) => v !== "")
        );
      };

      updatedKYCData.nextOfKin = cleanData(updatedKYCData.nextOfKin || {});
      updatedKYCData.bankDetails = cleanData(updatedKYCData.bankDetails || {});
      updatedKYCData.corporateInfo = cleanData(updatedKYCData.corporateInfo || {});

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
      res.status(200).json({ message: "KYC Updated Successfully", kyc: user.kycData });
    });
  } catch (error) {
    console.error("[SERVER ERROR] KYC update error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};




// **Verify KYC (Admin Only)**
// Verify or Reject KYC (Admin Only)
exports.verifyKYC = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { kycStatus: status, kycVerified: status === "verified" },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `KYC ${status} successfully`, user });
  } catch (error) {
    console.error("KYC Verification Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


