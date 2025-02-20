// routes/adminRoutes.js
const express = require('express');
const { adminLogin, getUsers, deleteUser, updateUserRole, getKYCRequests, approveKYC, rejectKYC, getDashboardStats } = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// Admin Authentication
router.post('/login', adminLogin);

// User Management
router.get('/users', verifyAdmin, getUsers);
router.delete('/users/:id', verifyAdmin, deleteUser);
router.put('/users/:id/role', verifyAdmin, updateUserRole);

// KYC Management
router.get('/kyc-requests', verifyAdmin, getKYCRequests);
router.put('/kyc/:id/approve', verifyAdmin, approveKYC);
router.put('/kyc/:id/reject', verifyAdmin, rejectKYC);

// Dashboard Stats
router.get('/stats', verifyAdmin, getDashboardStats);

module.exports = router;