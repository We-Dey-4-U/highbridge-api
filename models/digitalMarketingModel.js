const mongoose = require("mongoose");

const digitalMarketingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    knowledge: { type: String }, // Optional field
  },
  { timestamps: true }
);

module.exports = mongoose.model("DigitalMarketing", digitalMarketingSchema);
