const mongoose = require("mongoose");

const realtorSchema = new mongoose.Schema(
  {
    serialNumber: { type: Number, unique: true }, // Auto-incremented Serial Number
    Name: { type: String, required: true },
    Username: { type: String, required: true },
    Gender: { type: String, required: true },
    Mobile: { type: String, required: true },
    Email: { type: String, required: true, unique: true },
    "Bank Name": { type: String, required: true },
    "Account Name": { type: String, required: true },
    "Account Number": { type: String, required: true, unique: true },
    "Referral Code": { type: Number, unique: true },
    Referrer: { type: String, default: "" },
    "No Of Referrals": { type: Number, default: 0 },
    "Date Of Birth": { type: String, required: true }, // Keeping as string to match format
    "Date & Time": {
      type: String,
      default: new Date().toLocaleString("en-US", { hour12: true }),
    },
  },
  { timestamps: true }
);

// Auto-incrementing Serial Number
realtorSchema.pre("save", async function (next) {
  if (!this.serialNumber) {
    const lastRealtor = await mongoose.model("Realtor").findOne().sort({ serialNumber: -1 });
    this.serialNumber = lastRealtor ? lastRealtor.serialNumber + 1 : 1;
  }
  next();
});

const Realtor = mongoose.model("Realtor", realtorSchema);
module.exports = Realtor;