const mongoose = require("mongoose");

const InvestmentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    plan: { type: String, required: true, enum: ["6-months","9-months", "12-months", "18-months"] },
    startDate: { type: Date, default: Date.now },
    maturityDate: { type: Date, required: true },
    expectedReturns: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ["Pending", "Active", "Matured", "Withdrawn"], 
        default: "Pending" 
    },
    tx_ref: { type: String, required: true, unique: true }, // Transaction reference  Match tx_ref with Payment
});

// Automatically calculate maturity date and expected returns
// Define plan durations and ROI percentages
const planDetails = {
    '6-months': { duration: 180, roi: 0.25 },  // 25% ROI in 6 months
    '9-months': { duration: 270, roi: 0.30 },  // 30% ROI in 9 months
    '12-months': { duration: 365, roi: 0.50 }, // 50% ROI in 12 months
    '18-months': { duration: 540, roi: 0.75 }  // 75% ROI in 18 months
};

// Calculate maturity date dynamically
InvestmentSchema.pre('validate', function (next) {
    const plan = planDetails[this.plan];
    if (plan) {
        this.maturityDate = new Date(this.startDate);
        this.maturityDate.setDate(this.maturityDate.getDate() + plan.duration);
    } else {
        this.maturityDate = new Date(this.startDate);
        this.maturityDate.setDate(this.maturityDate.getDate() + 365); // Default to 1 year
    }
    next();
});

// Calculate expected returns
InvestmentSchema.virtual('expectedReturn').get(function () {
    const plan = planDetails[this.plan];
    return plan ? this.amount * (1 + plan.roi) : this.amount * 1.5; // Default 50% ROI
});

module.exports = mongoose.model('Investment', InvestmentSchema);