const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    investment: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: true },
    amount: { type: Number, required: true },
    tx_ref: { type: String, required: true, unique: true },
    paymentStatus: { 
        type: String, 
        enum: ["Pending", "Completed", "Failed"], 
        default: "Pending" 
    },
    flutterwaveTransactionId: { type: String }, // Made optional initially
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);