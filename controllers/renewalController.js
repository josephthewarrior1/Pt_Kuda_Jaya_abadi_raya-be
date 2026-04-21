const renewalDAO = require('../dao/renewalDAO');
const customerDAO = require('../dao/customerDAO');
const carDAO = require('../dao/carDAO');
const paymentDAO = require('../dao/paymentDAO');

const ALLOWED_POLICY_TYPES = ['car'];
const ALLOWED_RENEWAL_STATUSES = ['Pending', 'Approved', 'Completed', 'Cancelled'];

const getPolicyRecord = async (policyType, policyId, userId) => {
  if (policyType === 'car') {
    return carDAO.getCarById(policyId, userId);
  }

  return null;
};

const getPolicyDates = (policyType, policy) => {
  if (policyType === 'car') {
    return {
      startDate: policy.carData?.startDate || null,
      endDate: policy.carData?.dueDate || null,
    };
  }

  return {
    startDate: null,
    endDate: null,
  };
};

const enrichRenewals = async (renewals, userId) => {
  const customers = await customerDAO.getAllCustomersByUser(userId);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name || '']));

  return Promise.all(renewals.map(async (renewal) => {
    const policy = renewal.policyId ? await getPolicyRecord(renewal.policyType, renewal.policyId, userId) : null;
    let policySummary = '';

    if (renewal.policyType === 'car' && policy) {
      policySummary = `${policy.carData?.ownerName || '-'} - ${policy.carData?.carBrand || ''} ${policy.carData?.carModel || ''}`.trim();
    }

    return {
      ...renewal,
      customerName: customerMap.get(renewal.customerId) || '',
      policySummary,
    };
  }));
};

class RenewalController {
  async getAllRenewals(req, res) {
    try {
      const userId = req.user.username;
      const renewals = await renewalDAO.getAllRenewalsByUser(userId);
      const enrichedRenewals = await enrichRenewals(renewals, userId);

      res.status(200).json({
        success: true,
        count: enrichedRenewals.length,
        renewals: enrichedRenewals,
      });
    } catch (error) {
      console.error('Renewal list error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching renewals',
      });
    }
  }

  async getRenewalById(req, res) {
    try {
      const userId = req.user.username;
      const renewal = await renewalDAO.getRenewalById(req.params.id, userId);

      if (!renewal) {
        return res.status(404).json({
          success: false,
          error: 'Renewal not found',
        });
      }

      const [enrichedRenewal] = await enrichRenewals([renewal], userId);
      res.status(200).json({
        success: true,
        renewal: enrichedRenewal,
      });
    } catch (error) {
      console.error('Renewal detail error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching renewal',
      });
    }
  }

  async getRenewalsByCustomer(req, res) {
    try {
      const userId = req.user.username;
      const renewals = await renewalDAO.getRenewalsByCustomerId(req.params.customerId, userId);
      const enrichedRenewals = await enrichRenewals(renewals, userId);

      res.status(200).json({
        success: true,
        count: enrichedRenewals.length,
        renewals: enrichedRenewals,
      });
    } catch (error) {
      console.error('Renewal by customer error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching renewals by customer',
      });
    }
  }

  async getRenewalsByStatus(req, res) {
    try {
      const userId = req.user.username;
      const { status } = req.params;

      if (!ALLOWED_RENEWAL_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Use: Pending, Approved, Completed, or Cancelled',
        });
      }

      const renewals = await renewalDAO.getRenewalsByStatus(status, userId);
      const enrichedRenewals = await enrichRenewals(renewals, userId);

      res.status(200).json({
        success: true,
        count: enrichedRenewals.length,
        renewals: enrichedRenewals,
      });
    } catch (error) {
      console.error('Renewal by status error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching renewals by status',
      });
    }
  }

  async createRenewal(req, res) {
    try {
      const userId = req.user.username;
      const {
        customerId,
        policyType,
        policyId,
        newStartDate,
        newEndDate,
        premium,
        status,
        notes,
      } = req.body;

      if (!customerId || !customerId.trim()) {
        return res.status(400).json({ success: false, error: 'Customer ID is required' });
      }

      if (!policyType || !ALLOWED_POLICY_TYPES.includes(policyType)) {
        return res.status(400).json({ success: false, error: 'Invalid policy type. Use: car' });
      }

      if (!policyId || !policyId.trim()) {
        return res.status(400).json({ success: false, error: 'Policy ID is required' });
      }

      if (!newStartDate || !newEndDate) {
        return res.status(400).json({ success: false, error: 'New start date and new end date are required' });
      }

      const customer = await customerDAO.getCustomerById(customerId.trim(), userId);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }

      const policy = await getPolicyRecord(policyType, policyId.trim(), userId);
      if (!policy) {
        return res.status(404).json({ success: false, error: 'Policy not found' });
      }

      // ── Guard: block if there's already a Pending/Approved renewal for this vehicle ──
      const existingPendingRenewal = await renewalDAO.getActivePendingRenewalByPolicy(policyId.trim(), userId);
      if (existingPendingRenewal) {
        return res.status(409).json({
          success: false,
          error: `Kendaraan ini sudah memiliki renewal aktif (${existingPendingRenewal.id}) dengan status "${existingPendingRenewal.status}". Selesaikan atau batalkan renewal tersebut terlebih dahulu.`,
          existingRenewalId: existingPendingRenewal.id,
        });
      }

      const oldDates = getPolicyDates(policyType, policy);
      const normalizedStatus = status && ALLOWED_RENEWAL_STATUSES.includes(status) ? status : 'Pending';

      const renewal = await renewalDAO.createRenewal({
        customerId: customerId.trim(),
        policyType,
        policyId: policyId.trim(),
        paymentId: '', // optional legacy field (kept empty)
        oldStartDate: oldDates.startDate,
        oldEndDate: oldDates.endDate,
        newStartDate,
        newEndDate,
        premium: premium ? parseFloat(premium) : 0,
        status: normalizedStatus,
        notes: notes ? notes.trim() : '',
        completedAt: null,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      res.status(201).json({
        success: true,
        message: 'Renewal created successfully',
        renewal,
      });
    } catch (error) {
      console.error('Renewal create error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while creating renewal',
      });
    }
  }

  async updateRenewal(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      const existingRenewal = await renewalDAO.getRenewalById(id, userId);

      if (!existingRenewal) {
        return res.status(404).json({
          success: false,
          error: 'Renewal not found',
        });
      }

      const {
        paymentId,
        newStartDate,
        newEndDate,
        premium,
        status,
        notes,
      } = req.body;

      if (status !== undefined && !ALLOWED_RENEWAL_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Use: Pending, Approved, Completed, or Cancelled',
        });
      }

      if (paymentId !== undefined && paymentId) {
        const payment = await paymentDAO.getPaymentById(paymentId.trim(), userId);
        if (!payment) {
          return res.status(404).json({
            success: false,
            error: 'Payment not found',
          });
        }
      }

      const updateData = {
        paymentId: paymentId !== undefined ? paymentId.trim() : undefined,
        newStartDate: newStartDate !== undefined ? newStartDate : undefined,
        newEndDate: newEndDate !== undefined ? newEndDate : undefined,
        premium: premium !== undefined ? parseFloat(premium) || 0 : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes.trim() : undefined,
      };

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const renewal = await renewalDAO.updateRenewal(id, updateData, userId);
      res.status(200).json({
        success: true,
        message: 'Renewal updated successfully',
        renewal,
      });
    } catch (error) {
      console.error('Renewal update error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while updating renewal',
      });
    }
  }

  async completeRenewal(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      const renewal = await renewalDAO.getRenewalById(id, userId);

      if (!renewal) {
        return res.status(404).json({
          success: false,
          error: 'Renewal not found',
        });
      }

      if (!renewal.newStartDate || !renewal.newEndDate) {
        return res.status(400).json({
          success: false,
          error: 'Renewal dates are incomplete',
        });
      }

      if (!renewal.paymentId) {
        return res.status(400).json({
          success: false,
          error: 'Renewal must be linked to a Payment',
        });
      }

      const payment = await paymentDAO.getPaymentById(renewal.paymentId, userId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Linked payment not found',
        });
      }

      if (payment.status !== 'Paid') {
        return res.status(400).json({
          success: false,
          error: 'Linked payment must be Paid before completing renewal',
        });
      }

      if (renewal.policyType === 'car') {
        await carDAO.updateCar(renewal.policyId, {
          carData: {
            startDate: renewal.newStartDate,
            dueDate: renewal.newEndDate,
          },
          status: 'Active',
        }, userId);
      }

      const completedRenewal = await renewalDAO.updateRenewal(id, {
        status: 'Completed',
        completedAt: new Date().toISOString(),
      }, userId);

      res.status(200).json({
        success: true,
        message: 'Renewal completed successfully',
        renewal: completedRenewal,
      });
    } catch (error) {
      console.error('Renewal completion error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while completing renewal',
      });
    }
  }
}

module.exports = new RenewalController();
