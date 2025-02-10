const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Investment Schema
const InvestmentSchema = new mongoose.Schema({
  plan: { type: String, required: true }, 
  amount: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  maturityDate: { type: Date, required: true },
  status: { type: String, enum: ["Active", "Completed", "Pending"], default: "Pending" },
  tx_ref: { type: String, required: true } // Renamed from transactionId to trx
}, { timestamps: true });

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  kycVerified: { type: Boolean, default: false },
  investments: [InvestmentSchema], // Array of investment plans
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving



module.exports = mongoose.model("User", UserSchema);