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
    default: null, // Optional field
  },
  amount: {
    type: Number,
    default: function () {
      return this.qty * (this.unitPrice || 0); // Ensure amount calculates correctly even if unitPrice is missing
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
  }
}, { timestamps: true });

module.exports = mongoose.model('EnergyInventory', energyInventorySchema);