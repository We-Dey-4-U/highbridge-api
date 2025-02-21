const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require("./Investment");

const generateReferralCode = () => Math.floor(1000 + Math.random() * 9000).toString();

const kycSchema = new mongoose.Schema({
  residentialAddress: { type: String, default: "" },
  dateOfBirth: { type: String, default: "" },
  nationality: { type: String, default: "" },
  maritalStatus: { type: String, default: "" },
  occupation: { type: String, default: "" },
  placeOfWork: { type: String, default: "" },
  workAddress: { type: String, default: "" },
  idDocumentType: { type: String, enum: ["passport", "driver_license", "national_id"], default: "passport" },
  idDocumentImage: { type: String, default: "" },
  nextOfKin: {
    name: { type: String, default: "" },
    relationship: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  bankDetails: {
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    accountName: { type: String, default: "" },
  },
  corporateInfo: {
    corporateName: { type: String, default: "" },
    corporateAddress: { type: String, default: "" },
    contactName: { type: String, default: "" },
    correspondenceAddress: { type: String, default: "" },
    corporatePhone: { type: String, default: "" },
    corporateEmail: { type: String, default: "" },
  },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  referralCode: { type: String, unique: true, default: generateReferralCode },
  referer: { type: String, default: null },
  profileImage: { type: String },
  kycStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" }, // Track KYC status
  kycVerified: { type: Boolean, default: false },
  kycData: { type: kycSchema, default: {} }, // Now `kycData` will always be initialized
  investments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Investment" }],
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }], // New reference
  role: { type: String, enum: ["user", "admin"], default: "user" }, // New field for roles
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
// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);