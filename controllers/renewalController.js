const renewalDAO = require('../dao/renewalDAO');
const customerDAO = require('../dao/customerDAO');
const carDAO = require('../dao/carDAO');
const paymentDAO = require('../dao/paymentDAO');

const ALLOWED_RENEWAL_STATUSES = ['Pending', 'Approved', 'Completed', 'Cancelled'];

const getCarDates = (car) => {
  return {
    startDate: car.carData?.startDate || null,
    endDate: car.carData?.dueDate || null,
  };
};

const enrichRenewals = async (renewals, userId) => {
  const customers = await customerDAO.getAllCustomersByUser(userId);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name || '']));

  return Promise.all(renewals.map(async (renewal) => {
    const car = renewal.carId ? await carDAO.getCarById(renewal.carId, userId) : null;
    let carSummary = '';

    if (car) {
      carSummary = `${car.carData?.ownerName || '-'} - ${car.carData?.carBrand || ''} ${car.carData?.carModel || ''}`.trim();
    }

    return {
      ...renewal,
      customerName: customerMap.get(renewal.customerId) || '',
      carSummary,
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
        carId,
        newStartDate,
        newEndDate,
        premium,
        status,
        notes,
      } = req.body;

      if (!customerId || !customerId.trim()) {
        return res.status(400).json({ success: false, error: 'Customer ID is required' });
      }

      if (!carId || !carId.trim()) {
        return res.status(400).json({ success: false, error: 'Car ID is required' });
      }

      if (!newStartDate || !newEndDate) {
        return res.status(400).json({ success: false, error: 'New start date and new end date are required' });
      }

      const customer = await customerDAO.getCustomerById(customerId.trim(), userId);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }

      const car = await carDAO.getCarById(carId.trim(), userId);
      if (!car) {
        return res.status(404).json({ success: false, error: 'Car not found' });
      }

      // ── Guard: block if car expires in more than 30 days ──
      const dueDate = car.carData?.dueDate;
      if (dueDate) {
        const daysLeft = Math.round((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 30) {
          return res.status(400).json({
            success: false,
            error: `Tidak dapat membuat renewal. Sisa masa aktif polis kendaraan masih ${daysLeft} hari (> 30 hari).`,
          });
        }
      }

      // ── Guard: block if there's already a Pending/Approved renewal for this car ──
      const existingPendingRenewal = await renewalDAO.getActivePendingRenewalByCar(carId.trim(), userId);
      if (existingPendingRenewal) {
        const carName = car.carData 
          ? `${car.carData.carBrand || ''} ${car.carData.carModel || ''}`.trim() 
          : 'kendaraan';
        return res.status(409).json({
          success: false,
          error: `Mobil ${carName} sudah memiliki perpanjangan aktif dengan status "${existingPendingRenewal.status}". Selesaikan atau batalkan perpanjangan tersebut terlebih dahulu.`,
          existingRenewalId: existingPendingRenewal.id,
        });
      }

      const oldDates = getCarDates(car);
      const normalizedStatus = status && ALLOWED_RENEWAL_STATUSES.includes(status) ? status : 'Pending';

      const renewal = await renewalDAO.createRenewal({
        customerId: customerId.trim(),
        carId: carId.trim(),
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

      if (renewal.carId) {
        await carDAO.updateCar(renewal.carId, {
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
