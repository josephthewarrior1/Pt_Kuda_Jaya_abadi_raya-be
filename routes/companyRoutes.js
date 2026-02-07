const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');
const { upload } = require('../middlewares/upload');

// ==================== COMPANY PROFILE ROUTES ====================

// Create company profile (first-time setup)
router.post('/company/profile', 
  authMiddleware, 
  userAndPaidUserOnly, 
  (req, res) => companyController.createCompanyProfile(req, res)
);

// Get company profile (name, subtitle, city, logo)
router.get('/company/profile', 
  authMiddleware, 
  userAndPaidUserOnly, 
  (req, res) => companyController.getCompanyProfile(req, res)
);

// Update company profile (name, subtitle, city)
router.put('/company/profile', 
  authMiddleware, 
  userAndPaidUserOnly, 
  (req, res) => companyController.updateCompanyProfile(req, res)
);

// Upload company logo
router.post('/company/logo', 
  authMiddleware, 
  userAndPaidUserOnly,
  upload.single('logo'),
  (req, res) => companyController.uploadCompanyLogo(req, res)
);

// Delete company logo
router.delete('/company/logo', 
  authMiddleware, 
  userAndPaidUserOnly, 
  (req, res) => companyController.deleteCompanyLogo(req, res)
);

module.exports = router;