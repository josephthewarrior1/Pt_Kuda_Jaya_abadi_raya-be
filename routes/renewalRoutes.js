const express = require('express');
const router = express.Router();
const renewalController = require('../controllers/renewalController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');

router.get('/renewals/status/:status', authMiddleware, userAndPaidUserOnly, (req, res) =>
  renewalController.getRenewalsByStatus(req, res)
);

router.get('/renewals/customer/:customerId', authMiddleware, userAndPaidUserOnly, (req, res) =>
  renewalController.getRenewalsByCustomer(req, res)
);

router.get('/renewals', authMiddleware, userAndPaidUserOnly, (req, res) =>
  renewalController.getAllRenewals(req, res)
);

router.get('/renewals/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
  renewalController.getRenewalById(req, res)
);

router.post('/renewals', authMiddleware, userAndPaidUserOnly, (req, res) =>
  renewalController.createRenewal(req, res)
);

router.put('/renewals/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
  renewalController.updateRenewal(req, res)
);

router.post('/renewals/:id/complete', authMiddleware, userAndPaidUserOnly, (req, res) =>
  renewalController.completeRenewal(req, res)
);

module.exports = router;
