const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/quotations', authMiddleware, quotationController.createQuotation);
router.get('/quotations/policy/:policyId', authMiddleware, quotationController.getQuotationsByPolicy);
router.get('/quotations/:id', authMiddleware, quotationController.getQuotationById);
router.post('/quotations/:id/accept', authMiddleware, quotationController.acceptQuotation);
router.delete('/quotations/:id', authMiddleware, quotationController.deleteQuotation);

module.exports = router;
