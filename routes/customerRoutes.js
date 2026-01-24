const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');
const { 
  uploadCarPhotos, 
  uploadKtpPhoto, 
  uploadInsuranceDocuments, 
  handleMulterError 
} = require('../middlewares/upload');

// ==================== CUSTOMER ROUTES (USER & PAID_USER ONLY) ====================
// Admin TIDAK bisa akses

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes!

// Search customers - HARUS DI ATAS /:id
router.get('/customers/search', authMiddleware, userAndPaidUserOnly, (req, res) =>
  customerController.searchCustomers(req, res)
);

// Get customer statistics - HARUS DI ATAS /:id
router.get('/customers/stats', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.getCustomerStats(req, res)
);

// Get all customers
router.get('/customers', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.getAllCustomers(req, res)
);

// Get customer by ID - HARUS DI BAWAH /search dan /stats
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

// Upload KTP photo
router.post('/customers/:id/upload-ktp', 
  authMiddleware, 
  userAndPaidUserOnly,
  uploadKtpPhoto,
  handleMulterError, // Tambah error handler
  (req, res) => customerController.uploadKtpPhoto(req, res)
);

// Upload car photos (6 photos: stnk, left, right, front, back, dashboard)
router.post('/customers/:id/upload-photos', 
  authMiddleware, 
  userAndPaidUserOnly,
  uploadCarPhotos,
  handleMulterError, // Tambah error handler
  (req, res) => customerController.uploadCarPhotos(req, res)
);

// Upload insurance documents (policy, STNK, etc)
router.post('/customers/:id/upload-documents', 
  authMiddleware, 
  userAndPaidUserOnly,
  uploadInsuranceDocuments,
  handleMulterError, // Tambah error handler
  (req, res) => customerController.uploadInsuranceDocuments(req, res)
);

// Delete customer
router.delete('/customers/:id', authMiddleware, userAndPaidUserOnly, (req, res) => 
  customerController.deleteCustomer(req, res)
);

module.exports = router;