const EnergyInventory = require('../models/energyInventoryModel');

// Fetch all inventory items
const getInventory = async (req, res) => {
  try {
    const inventory = await EnergyInventory.find().sort({ no: 1 }); // Sort by `no`
    res.status(200).json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a new inventory item
// Add a new inventory item
const addInventoryItem = async (req, res) => {
  const { particulars, productCode, qty, unitPrice, qtyIn, qtyOut } = req.body;

  try {
    // Calculate `no` for the new item
    const lastItem = await EnergyInventory.findOne().sort({ no: -1 });
    const newNo = lastItem ? lastItem.no + 1 : 1;

    const newItem = new EnergyInventory({
      no: newNo,
      particulars,
      productCode,
      qty,
      unitPrice,
      qtyIn,
      qtyOut,
      amount: qty * unitPrice, // Automatically calculated
      totalPrice: qty * unitPrice, // Dynamically calculated here
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};






// Update stock levels
const updateInventory = async (req, res) => {
  const { id } = req.params;
  const { qtyIn, qtyOut, unitPrice } = req.body;

  try {
    const item = await EnergyInventory.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.qty += qtyIn - qtyOut;
    item.qtyIn += qtyIn;
    item.qtyOut += qtyOut;

    if (unitPrice !== undefined) {
      item.unitPrice = unitPrice;
    }

    // Recalculate amount based on qty and unitPrice
    item.amount = item.qty * item.unitPrice;

    const updatedItem = await item.save();
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Delete an inventory item
const deleteInventoryItem = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedItem = await EnergyInventory.findByIdAndDelete(id);
    if (!deletedItem) return res.status(404).json({ message: "Item not found" });

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const getTotalInventoryValue = async (req, res) => {
    try {
      const inventory = await EnergyInventory.find();
      const totalValue = inventory.reduce((sum, item) => sum + item.totalPrice, 0);
      res.status(200).json({ totalInventoryValue: totalValue });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

module.exports = {
  getInventory,
  addInventoryItem,
  updateInventory,
  deleteInventoryItem,
  getTotalInventoryValue,
};
