const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

module.exports = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1]; // Extract token

    if (!token) {
      return res.status(401).json({ message: "Access Denied! No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    console.log("Decoded Token:", decoded);

    // Fetch user from DB (excluding password)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; // Attach full user object to req.user
    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    res.status(400).json({ message: "Invalid Token" });
  }
};

