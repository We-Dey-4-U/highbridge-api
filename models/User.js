const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require("./Investment");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  kycVerified: { type: Boolean, default: false },
  investments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Investment" }],
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }], // New reference
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);