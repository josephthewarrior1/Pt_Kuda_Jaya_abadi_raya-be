const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');
const { uploadPaymentProof } = require('../middlewares/upload');

router.get('/payments/status/:status', authMiddleware, userAndPaidUserOnly, (req, res) =>
  paymentController.getPaymentsByStatus(req, res)
);

router.get('/payments/customer/:customerId', authMiddleware, userAndPaidUserOnly, (req, res) =>
  paymentController.getPaymentsByCustomer(req, res)
);

router.get('/payments', authMiddleware, userAndPaidUserOnly, (req, res) =>
  paymentController.getAllPayments(req, res)
);

router.get('/payments/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
  paymentController.getPaymentById(req, res)
);

router.post('/payments', authMiddleware, userAndPaidUserOnly, (req, res) =>
  paymentController.createPayment(req, res)
);

router.put('/payments/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
  paymentController.updatePayment(req, res)
);

router.post(
  '/payments/:id/upload-proof',
  authMiddleware,
  userAndPaidUserOnly,
  uploadPaymentProof,
  (req, res) => paymentController.uploadProof(req, res)
);

router.delete('/payments/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
  paymentController.deletePayment(req, res)
);

module.exports = router;
