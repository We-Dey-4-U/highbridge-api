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
const addInventoryItem = async (req, res) => {
  const { particulars, productCode, qty, unitPrice, qtyIn, qtyOut } = req.body;

  try {
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
      amount: qty * unitPrice,
      totalPrice: qty * unitPrice,
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};




// Update inventory item
const updateInventory = async (req, res) => {
  const { id } = req.params;
  const { qty, qtyIn = 0, qtyOut = 0, unitPrice } = req.body;

  try {
    const item = await EnergyInventory.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Update quantity based on input
    if (qty !== undefined) {
      item.qty = Number(qty); // Direct assignment if qty is provided
    } else {
      item.qty += Number(qtyIn) - Number(qtyOut); // Adjust existing qty
    }

    // Update unit price if provided
    if (unitPrice !== undefined) {
      item.unitPrice = Number(unitPrice);
    }

    // Ensure proper update of qtyIn and qtyOut
    item.qtyIn += Number(qtyIn);
    item.qtyOut += Number(qtyOut);

    // Recalculate amounts
    item.amount = item.qty * item.unitPrice;
    item.totalPrice = item.amount;

    // Save the updated document
    const updatedItem = await item.save();

    res.status(200).json({ message: "Inventory updated successfully", item: updatedItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

// Get total inventory value
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