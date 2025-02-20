// models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "NGN" }, // ✅ Changed default to NGN
    status: { type: String, enum: ["Pending", "Completed", "Failed", "Cancelled"], default: "Pending" },
    tx_ref: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);
