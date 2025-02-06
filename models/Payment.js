const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
    payment_id: {
      type: String,
      unique: true,
      default: () => require('uuid').v4(),
    },
    tx_ref: {
      type: String,
      required: true,
      unique: true
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true, enum: ["pending", "successful", "failed"] },
    createdAt: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model("Payment", paymentSchema);