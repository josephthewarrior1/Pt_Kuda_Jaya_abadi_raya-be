const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');

router.post('/quotations', authMiddleware, userAndPaidUserOnly, quotationController.createQuotation);
router.get('/quotations/policy/:policyId', authMiddleware, userAndPaidUserOnly, quotationController.getQuotationsByPolicy);
router.get('/quotations/:id', authMiddleware, userAndPaidUserOnly, quotationController.getQuotationById);
router.post('/quotations/:id/accept', authMiddleware, userAndPaidUserOnly, quotationController.acceptQuotation);
router.delete('/quotations/:id', authMiddleware, userAndPaidUserOnly, quotationController.deleteQuotation);

module.exports = router;
