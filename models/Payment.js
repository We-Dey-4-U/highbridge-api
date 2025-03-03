// models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    investment: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
    amount: { type: Number, required: true },
    receipt: {
        type: String,
        required: function () {
          return this.paymentMethod === "manual"; // Only required if payment is manual
        },
    },
    currency: { type: String, required: true, default: "NGN" },
    status: { 
        type: String, 
        enum: ["Pending", "Completed", "Failed", "Cancelled"], 
        default: "Pending",
        set: (val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() // Auto-fix status case
    },
    tx_ref: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);
