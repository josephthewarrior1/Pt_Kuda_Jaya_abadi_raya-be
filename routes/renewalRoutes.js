const express = require('express');
const router = express.Router();
const renewalController = require('../controllers/renewalController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/renewals/status/:status', authMiddleware, (req, res) =>
  renewalController.getRenewalsByStatus(req, res)
);

router.get('/renewals/customer/:customerId', authMiddleware, (req, res) =>
  renewalController.getRenewalsByCustomer(req, res)
);

router.get('/renewals', authMiddleware, (req, res) =>
  renewalController.getAllRenewals(req, res)
);

router.get('/renewals/:id', authMiddleware, (req, res) =>
  renewalController.getRenewalById(req, res)
);

router.post('/renewals', authMiddleware, (req, res) =>
  renewalController.createRenewal(req, res)
);

router.put('/renewals/:id', authMiddleware, (req, res) =>
  renewalController.updateRenewal(req, res)
);

router.post('/renewals/:id/complete', authMiddleware, (req, res) =>
  renewalController.completeRenewal(req, res)
);

module.exports = router;
