const paymentDAO = require('../dao/paymentDAO');
const customerDAO = require('../dao/customerDAO');
const carDAO = require('../dao/carDAO');
const propertyDAO = require('../dao/propertyDAO');
const invoiceDAO = require('../dao/invoiceDAO');
const renewalDAO = require('../dao/renewalDAO');
const cloudinary = require('../config/cloudinary');

const ALLOWED_POLICY_TYPES = ['car', 'property'];
const ALLOWED_STATUSES = ['Pending', 'Paid', 'Overdue', 'Cancelled'];

// ─── Helper: Auto-complete a Renewal when its Payment is marked Paid ──────────
const autoCompleteRenewal = async (payment, userId) => {
  if (!payment.renewalId) return;
  const renewal = await renewalDAO.getRenewalById(payment.renewalId, userId);
  if (!renewal || renewal.status === 'Completed') return;

  if (!renewal.newStartDate || !renewal.newEndDate) return;

  // Update the car/policy with new dates
  if (renewal.policyType === 'car') {
    await carDAO.updateCar(renewal.policyId, {
      carData: { startDate: renewal.newStartDate, dueDate: renewal.newEndDate },
      status: 'Active',
    }, userId);
  } else if (renewal.policyType === 'property') {
    await propertyDAO.updateProperty(renewal.policyId, {
      insuranceData: { startDate: renewal.newStartDate, endDate: renewal.newEndDate, premium: renewal.premium },
      status: 'Active',
    }, userId);
  }

  await renewalDAO.updateRenewal(renewal.id, {
    status: 'Completed',
    completedAt: new Date().toISOString(),
  }, userId);

  console.log(`✅ Auto-completed Renewal ${renewal.id} → Car/Policy updated to Active`);
};

const isPastDue = (dueDate) => {
  if (!dueDate) {
    return false;
  }

  return new Date(dueDate).getTime() < Date.now();
};

const resolvePaymentStatus = ({ status, dueDate, paidDate }) => {
  if (status === 'Cancelled') {
    return 'Cancelled';
  }

  if (paidDate || status === 'Paid') {
    return 'Paid';
  }

  if (isPastDue(dueDate)) {
    return 'Overdue';
  }

  return 'Pending';
};

const getPolicyRecord = async (policyType, policyId, userId) => {
  if (policyType === 'car') {
    return carDAO.getCarById(policyId, userId);
  }

  if (policyType === 'property') {
    return propertyDAO.getPropertyById(policyId, userId);
  }

  return null;
};

const enrichPayments = async (payments, userId) => {
  const customers = await customerDAO.getAllCustomersByUser(userId);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name || '']));

  return Promise.all(payments.map(async (payment) => {
    let policySummary = '';

    if (payment.policyType === 'car' && payment.policyId) {
      const car = await carDAO.getCarById(payment.policyId, userId);
      if (car) {
        policySummary = `${car.carData?.ownerName || '-'} - ${car.carData?.carBrand || ''} ${car.carData?.carModel || ''}`.trim();
      }
    }

    if (payment.policyType === 'property' && payment.policyId) {
      const property = await propertyDAO.getPropertyById(payment.policyId, userId);
      if (property) {
        policySummary = `${property.propertyData?.propertyType || '-'} - ${property.propertyData?.city || ''}`.trim();
      }
    }

    return {
      ...payment,
      customerName: customerMap.get(payment.customerId) || '',
      policySummary,
    };
  }));
};

class PaymentController {
  async getAllPayments(req, res) {
    try {
      const userId = req.user.username;
      const payments = await paymentDAO.getAllPaymentsByUser(userId);
      const enrichedPayments = await enrichPayments(payments, userId);

      res.status(200).json({
        success: true,
        count: enrichedPayments.length,
        payments: enrichedPayments,
      });
    } catch (error) {
      console.error('Payment list error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching payments',
      });
    }
  }

  async getPaymentById(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      const payment = await paymentDAO.getPaymentById(id, userId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      const [enrichedPayment] = await enrichPayments([payment], userId);

      res.status(200).json({
        success: true,
        payment: enrichedPayment,
      });
    } catch (error) {
      console.error('Payment detail error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching payment',
      });
    }
  }

  async getPaymentsByCustomer(req, res) {
    try {
      const userId = req.user.username;
      const { customerId } = req.params;
      const payments = await paymentDAO.getPaymentsByCustomerId(customerId, userId);
      const enrichedPayments = await enrichPayments(payments, userId);

      res.status(200).json({
        success: true,
        count: enrichedPayments.length,
        payments: enrichedPayments,
      });
    } catch (error) {
      console.error('Payment by customer error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching payments by customer',
      });
    }
  }

  async getPaymentsByStatus(req, res) {
    try {
      const userId = req.user.username;
      const { status } = req.params;

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Use: Pending, Paid, Overdue, or Cancelled',
        });
      }

      const payments = await paymentDAO.getPaymentsByStatus(status, userId);
      const enrichedPayments = await enrichPayments(payments, userId);

      res.status(200).json({
        success: true,
        count: enrichedPayments.length,
        payments: enrichedPayments,
      });
    } catch (error) {
      console.error('Payment by status error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching payments by status',
      });
    }
  }

  async createPayment(req, res) {
    try {
      const userId = req.user.username;
      const {
        customerId,
        policyType,
        policyId,
        invoiceNumber,
        amount,
        dueDate,
        paidDate,
        paymentMethod,
        status,
        notes,
      } = req.body;

      if (!customerId || !customerId.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID is required',
        });
      }

      if (!policyType || !ALLOWED_POLICY_TYPES.includes(policyType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid policy type. Use: car or property',
        });
      }

      if (!policyId || !policyId.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Policy ID is required',
        });
      }

      const customer = await customerDAO.getCustomerById(customerId.trim(), userId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      const policy = await getPolicyRecord(policyType, policyId.trim(), userId);
      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Policy not found',
        });
      }

      const normalizedStatus = resolvePaymentStatus({
        status,
        dueDate,
        paidDate,
      });

      const newPayment = await paymentDAO.createPayment({
        customerId: customerId.trim(),
        policyType,
        policyId: policyId.trim(),
        invoiceNumber: invoiceNumber ? invoiceNumber.trim() : '',
        amount: amount ? parseFloat(amount) : 0,
        dueDate: dueDate || null,
        paidDate: paidDate || null,
        paymentMethod: paymentMethod ? paymentMethod.trim() : '',
        status: normalizedStatus,
        proofUrl: '',
        notes: notes ? notes.trim() : '',
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      res.status(201).json({
        success: true,
        message: 'Payment record created successfully',
        payment: newPayment,
      });
    } catch (error) {
      console.error('Payment create error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while creating payment',
      });
    }
  }

  async updatePayment(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      const {
        customerId,
        policyType,
        policyId,
        invoiceNumber,
        amount,
        dueDate,
        paidDate,
        paymentMethod,
        status,
        notes,
      } = req.body;

      if (policyType !== undefined && !ALLOWED_POLICY_TYPES.includes(policyType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid policy type. Use: car or property',
        });
      }

      if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Use: Pending, Paid, Overdue, or Cancelled',
        });
      }

      const existingPayment = await paymentDAO.getPaymentById(id, userId);
      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      const nextCustomerId = customerId !== undefined ? customerId.trim() : existingPayment.customerId;
      const nextPolicyType = policyType !== undefined ? policyType : existingPayment.policyType;
      const nextPolicyId = policyId !== undefined ? policyId.trim() : existingPayment.policyId;

      if (customerId !== undefined) {
        const customer = await customerDAO.getCustomerById(nextCustomerId, userId);
        if (!customer) {
          return res.status(404).json({
            success: false,
            error: 'Customer not found',
          });
        }
      }

      if (policyType !== undefined || policyId !== undefined) {
        const policy = await getPolicyRecord(nextPolicyType, nextPolicyId, userId);
        if (!policy) {
          return res.status(404).json({
            success: false,
            error: 'Policy not found',
          });
        }
      }

      const nextDueDate = dueDate !== undefined ? dueDate : existingPayment.dueDate;
      const nextPaidDate = paidDate !== undefined ? paidDate : existingPayment.paidDate;
      const nextStatus = resolvePaymentStatus({
        status: status !== undefined ? status : existingPayment.status,
        dueDate: nextDueDate,
        paidDate: nextPaidDate,
      });

      const updateData = {
        customerId: customerId !== undefined ? customerId.trim() : undefined,
        policyType,
        policyId: policyId !== undefined ? policyId.trim() : undefined,
        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber.trim() : undefined,
        amount: amount !== undefined ? parseFloat(amount) || 0 : undefined,
        dueDate: dueDate !== undefined ? dueDate : undefined,
        paidDate: paidDate !== undefined ? paidDate : undefined,
        paymentMethod: paymentMethod !== undefined ? paymentMethod.trim() : undefined,
        status: nextStatus,
        notes: notes !== undefined ? notes.trim() : undefined,
      };

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedPayment = await paymentDAO.updatePayment(id, updateData, userId);

      // Sync Invoice Status if Payment becomes Paid
      if (updatedPayment.status === 'Paid' && updatedPayment.invoiceNumber) {
        try {
          await invoiceDAO.updateInvoice(updatedPayment.invoiceNumber, { status: 'Paid' }, userId);
        } catch (invoiceErr) {
          console.error('Failed to sync Invoice status upon payment update:', invoiceErr);
        }
      }

      // AUTO-COMPLETE RENEWAL if Payment is now Paid and has a renewalId
      if (updatedPayment.status === 'Paid' && updatedPayment.renewalId) {
        try {
          await autoCompleteRenewal(updatedPayment, userId);
        } catch (err) {
          console.error('Failed to auto-complete renewal:', err);
        }
      }

      // Auto-Activate Policy if it was Nonaktif
      if (updatedPayment.status === 'Paid' && updatedPayment.policyType === 'car' && updatedPayment.policyId) {
        try {
          const carData = await carDAO.getCarById(updatedPayment.policyId, userId);
          if (carData) {
            // carDAO sometimes returns {success:true, car: {...}} or directly the object, handle both:
            const car = carData.car || carData;
            if (car.status === 'Nonaktif') {
              await carDAO.updateCar(updatedPayment.policyId, { status: 'Active' }, userId);
            }
          }
        } catch (autoActivateErr) {
          console.error('Failed to auto-activate Nonaktif vehicle:', autoActivateErr);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Payment record updated successfully',
        payment: updatedPayment,
      });
    } catch (error) {
      console.error('Payment update error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while updating payment',
      });
    }
  }

  async uploadProof(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      const payment = await paymentDAO.getPaymentById(id, userId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      const proofFile = req.files?.proof?.[0];
      if (!proofFile) {
        return res.status(400).json({
          success: false,
          error: 'Proof file is required',
        });
      }

      const uploadedProofUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `insurance_payments/${userId}`,
            public_id: `${id}_proof`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result.secure_url);
            }
          }
        );

        stream.end(proofFile.buffer);
      });

      const paidDate = payment.paidDate || new Date().toISOString();
      const updatedPayment = await paymentDAO.updatePayment(id, {
        proofUrl: uploadedProofUrl,
        paidDate,
        status: 'Paid',
      }, userId);

      // Sync Invoice Status
      if (updatedPayment.invoiceNumber) {
        try {
          await invoiceDAO.updateInvoice(updatedPayment.invoiceNumber, { status: 'Paid' }, userId);
        } catch (invoiceErr) {
          console.error('Failed to sync Invoice status upon payment proof upload:', invoiceErr);
        }
      }

      // AUTO-COMPLETE RENEWAL if Payment has a renewalId
      if (updatedPayment.renewalId) {
        try {
          await autoCompleteRenewal(updatedPayment, userId);
        } catch (err) {
          console.error('Failed to auto-complete renewal after proof upload:', err);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Payment proof uploaded successfully',
        payment: updatedPayment,
      });
    } catch (error) {
      console.error('Payment proof upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while uploading payment proof',
      });
    }
  }

  async deletePayment(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;

      const existingPayment = await paymentDAO.getPaymentById(id, userId);
      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      // Check if invoice needs to be updated? Maybe not required for delete, 
      // but good practice to clear the invoice status logically.
      if (existingPayment.status === 'Paid' && existingPayment.invoiceNumber) {
        try {
          // If a payment is deleted, the invoice might become Pending again
          await invoiceDAO.updateInvoice(existingPayment.invoiceNumber, { status: 'Pending' }, userId);
        } catch (invoiceErr) {
          console.error('Failed to revert Invoice status upon payment deletion:', invoiceErr);
        }
      }

      await paymentDAO.deletePayment(id, userId);

      res.status(200).json({
        success: true,
        message: 'Payment record deleted successfully',
      });
    } catch (error) {
      console.error('Payment delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while deleting payment',
      });
    }
  }
}

module.exports = new PaymentController();
