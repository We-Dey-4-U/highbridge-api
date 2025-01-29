const mongoose = require("mongoose");

const realtorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  mobileNo: { type: String, required: true },
  gender: { type: String, required: true },
  dob: { type: Date, required: true },
  address: { type: String, required: true },
  bankName: { type: String, required: true },
  accountName: { type: String, required: true },
  accountNumber: { type: String, required: true, unique: true },
  referralCode: { type: String, unique: true }, // Generated code
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Realtor", default: null }, // Who referred them?
}, { timestamps: true });

const Realtor = mongoose.model("Realtor", realtorSchema);
module.exports = Realtor;