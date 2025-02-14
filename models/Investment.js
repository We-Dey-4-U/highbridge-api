const mongoose = require("mongoose");

const InvestmentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    plan: { type: String, required: true, enum: ["6months", "9months", "12months", "18months"] },
    startDate: { type: Date, default: Date.now },
    maturityDate: { type: Date, required: true },
    expectedReturns: { type: Number, required: false },  // Should be assigned explicitly
    status: { 
        type: String, 
        enum: ["Pending", "Active", "Matured", "Withdrawn"], 
        default: "Pending" 
    },
    tx_ref: { type: String, required: true, unique: true }, 
});

// Define plan durations and ROI percentages
const planDetails = {
    '6months': { duration: 180, roi: 0.25 },  
    '9months': { duration: 270, roi: 0.30 },  
    '12months': { duration: 365, roi: 0.50 }, 
    '18months': { duration: 540, roi: 0.75 }  
};

// Automatically calculate maturity date and expected returns
InvestmentSchema.pre('validate', function (next) {
    const plan = planDetails[this.plan];

    if (plan) {
        // Set maturity date
        this.maturityDate = new Date(this.startDate);
        this.maturityDate.setDate(this.maturityDate.getDate() + plan.duration);

        // Set expected returns before saving
        this.expectedReturns = this.amount * (1 + plan.roi);
    } else {
        this.maturityDate = new Date(this.startDate);
        this.maturityDate.setDate(this.maturityDate.getDate() + 365); // Default to 1 year
        this.expectedReturns = this.amount * 1.5;  // Default 50% ROI
    }

    next();
});

// Virtual population for user details
InvestmentSchema.virtual("userDetails", {
    ref: "User",
    localField: "user",
    foreignField: "_id",
    justOne: true,
});

InvestmentSchema.set("toJSON", { virtuals: true });
InvestmentSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model('Investment', InvestmentSchema);
