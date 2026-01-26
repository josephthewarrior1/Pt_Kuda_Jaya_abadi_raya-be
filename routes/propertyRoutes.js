const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');
const { uploadPropertyPhotos, uploadPropertyDocuments } = require('../middlewares/upload');

// ==================== PROPERTY ROUTES (USER & PAID_USER ONLY) ====================

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes!

// Search properties - HARUS DI ATAS /:id
router.get('/properties/search', authMiddleware, userAndPaidUserOnly, (req, res) =>
  propertyController.searchProperties(req, res)
);

// Get property statistics - HARUS DI ATAS /:id
router.get('/properties/stats', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.getPropertyStats(req, res)
);

// Check expired policies - HARUS DI ATAS /:id
router.get('/properties/check-expired', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.checkExpiredPolicies(req, res)
);

// Get properties by status - HARUS DI ATAS /:id
router.get('/properties/status/:status', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.getPropertiesByStatus(req, res)
);

// Get all properties
router.get('/properties', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.getAllProperties(req, res)
);

// Get property by ID - HARUS DI BAWAH routes yang spesifik
router.get('/properties/:id', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.getPropertyById(req, res)
);

// Create new property1
router.post('/properties', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.createProperty(req, res)
);

// Update property
router.put('/properties/:id', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.updateProperty(req, res)
);

// Upload property photos (8 photos: front, back, left, right, interior1-4)
router.post('/properties/:id/upload-photos', 
  authMiddleware, 
  userAndPaidUserOnly,
  uploadPropertyPhotos,
  (req, res) => propertyController.uploadPropertyPhotos(req, res)
);

// Upload property documents (certificate, imb, pbb, other)
router.post('/properties/:id/upload-documents', 
  authMiddleware, 
  userAndPaidUserOnly,
  uploadPropertyDocuments,
  (req, res) => propertyController.uploadPropertyDocuments(req, res)
);

// Delete property
router.delete('/properties/:id', authMiddleware, userAndPaidUserOnly, (req, res) => 
  propertyController.deleteProperty(req, res)
);

module.exports = router;