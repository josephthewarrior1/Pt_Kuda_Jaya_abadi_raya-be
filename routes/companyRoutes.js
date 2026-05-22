const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/upload');

// ==================== COMPANY PROFILE ROUTES ====================

// Create company profile (first-time setup)
router.post('/company/profile', 
  authMiddleware, 
  (req, res) => companyController.createCompanyProfile(req, res)
);

// Get company profile (name, subtitle, city, logo)
router.get('/company/profile', 
  authMiddleware, 
  (req, res) => companyController.getCompanyProfile(req, res)
);

// Update company profile (name, subtitle, city)
router.put('/company/profile', 
  authMiddleware, 
  (req, res) => companyController.updateCompanyProfile(req, res)
);

// Upload company logo
router.post('/company/logo', 
  authMiddleware, 
  upload.single('logo'),
  (req, res) => companyController.uploadCompanyLogo(req, res)
);

// Delete company logo
router.delete('/company/logo', 
  authMiddleware, 
  (req, res) => companyController.deleteCompanyLogo(req, res)
);

module.exports = router;
