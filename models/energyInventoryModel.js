const mongoose = require('mongoose');

const energyInventorySchema = new mongoose.Schema({
  no: {
    type: Number,
    required: true,
    unique: true,
  },
  particulars: {
    type: String,
    required: true,
  },
  productCode: {
    type: String,
    required: true,
    unique: true,
  },
  qty: {
    type: Number,
    required: true,
    default: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    default: function () {
      return this.qty * this.unitPrice;
    },
  },
  qtyOut: {
    type: Number,
    required: true,
    default: 0,
  },
  qtyIn: {
    type: Number,
    required: true,
    default: 0,
  },
  totalPrice: {
    type: Number,
    default: function () {
      return this.qty * this.unitPrice; // Dynamically calculated
    },
  },
}, { timestamps: true });

// Pre-save middleware to calculate totalPrice dynamically
energyInventorySchema.pre('save', function(next) {
  this.totalPrice = this.qty * this.unitPrice;  // Calculate totalPrice dynamically
  next();
});

module.exports = mongoose.model('EnergyInventory', energyInventorySchema);