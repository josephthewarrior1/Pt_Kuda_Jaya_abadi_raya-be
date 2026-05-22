const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadCarPhotos, uploadDocuments } = require('../middlewares/upload');

// ==================== CUSTOMER ROUTES ====================

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes!

// Search customers - HARUS DI ATAS /:id
router.get('/customers/search', authMiddleware, (req, res) =>
  customerController.searchCustomers(req, res)
);

// Get customer statistics - HARUS DI ATAS /:id
router.get('/customers/stats', authMiddleware, (req, res) =>
  customerController.getCustomerStats(req, res)
);

// Get all customers
router.get('/customers', authMiddleware, (req, res) =>
  customerController.getAllCustomers(req, res)
);

// Get customer by ID - HARUS DI BAWAH /search dan /stats
router.get('/customers/:id', authMiddleware, (req, res) =>
  customerController.getCustomerById(req, res)
);

// Create new customer (with car data)
router.post('/customers', authMiddleware, (req, res) =>
  customerController.createCustomer(req, res)
);

// Update customer
router.put('/customers/:id', authMiddleware, (req, res) =>
  customerController.updateCustomer(req, res)
);

// Delete customer
router.delete('/customers/:id', authMiddleware, (req, res) =>
  customerController.deleteCustomer(req, res)
);

module.exports = router;
