const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../config/emailService");

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate input
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    console.log("Raw Password Before Hashing:", password);

    // Hash password
     // Hash the password before saving
     const salt = await bcrypt.genSalt(10);
     const hashedPassword = await bcrypt.hash(password, salt);
 
     console.log("Hashed Password Saved in DB:", hashedPassword);

    // Create a new user
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      investments: [], // Ensure investments array is initialized
    });

    await newUser.save();

    // Send welcome email
    const emailContent = `
      <h3>Welcome, ${name}!</h3>
      <p>Your registration was successful.</p>
      <p>You can now start investing.</p>
    `;
    await sendEmail(email, "Welcome to Our Platform!", emailContent);

    res.status(201).json({ message: "Registration successful. Check your email for confirmation." });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};







// User Login
// User Login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials (User not found)" });
    }

    console.log("Entered Password:", password);
    console.log("Stored Hashed Password:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials (Password mismatch)" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d", // Token expires in 7 days
    });

    res.json({
      message: "Login successful",
      token, // Send the token in the response
      user: { id: user._id, name: user.name, email: user.email }, // Optionally return user details
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};




// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};





// Get User Investments
exports.getUserInvestments = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you use authentication middleware

    const user = await User.findById(userId).select("investments");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ investments: user.investments });
  } catch (error) {
    console.error("Error fetching investments:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// Add Investment
exports.addInvestment = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming auth middleware
    const { plan, amount, maturityDate, transactionId } = req.body;

    if (!plan || !amount || !maturityDate || !transactionId) {
      return res.status(400).json({ message: "All investment details are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newInvestment = {
      plan,
      amount,
      maturityDate,
      transactionId,
      status: "Pending",
    };

    user.investments.push(newInvestment);
    await user.save();

    res.status(201).json({ message: "Investment added successfully", investment: newInvestment });
  } catch (error) {
    console.error("Error adding investment:", error);
    res.status(500).json({ message: "Server Error" });
  }
};