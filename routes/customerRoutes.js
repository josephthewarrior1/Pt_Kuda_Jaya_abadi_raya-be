const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');
const { uploadCarPhotos } = require('../middlewares/upload');

// ==================== CUSTOMER ROUTES (USER & PAID_USER ONLY) ====================
// Admin TIDAK bisa akses

// Get all customers (only for user & paid_user)
router.get('/customers', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.getAllCustomers(req, res)
);

// Search customers
router.get('/customers/search', authMiddleware, userAndPaidUserOnly, (req, res) =>
  customerController.searchCustomers(req, res)
);

// Get customer by ID
router.get('/customers/:id', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.getCustomerById(req, res)
);

// Create new customer (with car data)
router.post('/customers', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.createCustomer(req, res)
);

// Update customer
router.put('/customers/:id', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.updateCustomer(req, res)
);

// Upload car photos (4 photos: left, right, front, back)
router.post('/customers/:id/upload-photos', 
  authMiddleware, 
  userAndPaidUserOnly,
  uploadCarPhotos,
  (req, res) => customerController.uploadCarPhotos(req, res)
);

// Delete customer
router.delete('/customers/:id', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.deleteCustomer(req, res)
);

// Get customer statistics
router.get('/customers/stats', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.getCustomerStats(req, res)
);

module.exports = router;