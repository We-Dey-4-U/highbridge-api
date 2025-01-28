const express = require('express');
const router = express.Router();
const {
  getInventory,
  addInventoryItem,
  updateInventory,
  deleteInventoryItem,
  getTotalInventoryValue,
} = require('../controllers/energyInventoryController');

// Fetch all inventory items
router.get('/', getInventory);

// Add a new inventory item
router.post('/', addInventoryItem);

// Update stock levels for a specific item
router.put('/:id', updateInventory);

// Delete an inventory item
router.delete('/:id', deleteInventoryItem);

// Get total inventory value
router.get('/total-value', getTotalInventoryValue);

module.exports = router;