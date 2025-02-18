const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("./Investment");

const generateReferralCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit code
};

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  kycVerified: { type: Boolean, default: false }, // KYC status

  // Personal Information
  residentialAddress: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  nationality: { type: String, required: true },
  maritalStatus: { type: String, required: true },
  occupation: { type: String, required: true },
  placeOfWork: { type: String, required: true },
  workAddress: { type: String, required: true },

  // Corporate Information (Optional)
  corporateName: { type: String },
  corporateAddress: { type: String },
  contactName: { type: String },
  correspondenceAddress: { type: String },
  corporatePhone: { type: String },
  corporateEmail: { type: String },

  // Next of Kin Information
  nextOfKinName: { type: String, required: true },
  nextOfKinRelationship: { type: String, required: true },
  nextOfKinPhone: { type: String, required: true },
  nextOfKinAddress: { type: String, required: true },
  nextOfKinDateOfBirth: { type: Date, required: true },
  nextOfKinEmail: { type: String, required: true },

  // Bank Details (Part of KYC)
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },

  investments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Investment" }],
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],

  referralCode: { type: String, unique: true, default: generateReferralCode }, // Auto-generated 4-digit code
  referer: { type: String, default: null }, // Name of the referer (if referral code is used)

  createdAt: { type: Date, default: Date.now }
});





// Virtual field for investment details
UserSchema.virtual("investmentDetails", {
  ref: "Investment",
  localField: "_id",
  foreignField: "user",
});

// Ensure virtuals are included in JSON and Object outputs
UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

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