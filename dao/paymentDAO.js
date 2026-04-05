const { db } = require('../config/firebase');

class PaymentDAO {
  constructor() {
    this.paymentsRootRef = db.ref('payment_records');
    this.paymentCountRef = db.ref('payment_counters');
  }

  getUserPaymentsRef(userId) {
    return this.paymentsRootRef.child(userId);
  }

  async getNextPaymentNumber(userId) {
    try {
      const counterRef = this.paymentCountRef.child(userId);
      const snapshot = await counterRef.once('value');

      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }

      await counterRef.set(nextNumber);
      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next payment number: ' + error.message);
    }
  }

  async normalizePayment(paymentId, paymentData, userId) {
    return {
      id: paymentId,
      customerId: paymentData.customerId || '',
      policyType: paymentData.policyType || '',
      policyId: paymentData.policyId || '',
      invoiceNumber: paymentData.invoiceNumber || '',
      amount: paymentData.amount || 0,
      dueDate: paymentData.dueDate || null,
      paidDate: paymentData.paidDate || null,
      paymentMethod: paymentData.paymentMethod || '',
      status: paymentData.status || 'Pending',
      proofUrl: paymentData.proofUrl || '',
      notes: paymentData.notes || '',
      createdBy: paymentData.createdBy || userId,
      createdAt: paymentData.createdAt || Date.now(),
      updatedAt: paymentData.updatedAt || Date.now(),
    };
  }

  async getAllPaymentsByUser(userId) {
    try {
      const snapshot = await this.getUserPaymentsRef(userId).once('value');
      const payments = [];

      snapshot.forEach((childSnapshot) => {
        payments.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });

      payments.sort((a, b) => {
        const numA = parseInt((a.id.split('-pay-')[1] || '0'), 10);
        const numB = parseInt((b.id.split('-pay-')[1] || '0'), 10);
        return numB - numA;
      });

      return payments.map((payment) => ({
        id: payment.id,
        customerId: payment.customerId || '',
        policyType: payment.policyType || '',
        policyId: payment.policyId || '',
        invoiceNumber: payment.invoiceNumber || '',
        amount: payment.amount || 0,
        dueDate: payment.dueDate || null,
        paidDate: payment.paidDate || null,
        paymentMethod: payment.paymentMethod || '',
        status: payment.status || 'Pending',
        proofUrl: payment.proofUrl || '',
        notes: payment.notes || '',
        createdBy: payment.createdBy || userId,
        createdAt: payment.createdAt || Date.now(),
        updatedAt: payment.updatedAt || Date.now(),
      }));
    } catch (error) {
      throw new Error('Failed to fetch payments by user: ' + error.message);
    }
  }

  async getPaymentById(paymentId, userId) {
    try {
      const snapshot = await this.getUserPaymentsRef(userId).child(paymentId).once('value');

      if (!snapshot.exists()) {
        return null;
      }

      return this.normalizePayment(paymentId, snapshot.val(), userId);
    } catch (error) {
      throw new Error('Failed to fetch payment: ' + error.message);
    }
  }

  async createPayment(paymentData) {
    try {
      const { createdBy } = paymentData;
      const nextNumber = await this.getNextPaymentNumber(createdBy);
      const paymentId = `${createdBy}-pay-${nextNumber}`;
      const paymentToSave = {
        customerId: paymentData.customerId || '',
        policyType: paymentData.policyType || '',
        policyId: paymentData.policyId || '',
        invoiceNumber: paymentData.invoiceNumber || '',
        amount: paymentData.amount || 0,
        dueDate: paymentData.dueDate || null,
        paidDate: paymentData.paidDate || null,
        paymentMethod: paymentData.paymentMethod || '',
        status: paymentData.status || 'Pending',
        proofUrl: paymentData.proofUrl || '',
        notes: paymentData.notes || '',
        createdBy,
        createdAt: paymentData.createdAt || Date.now(),
        updatedAt: paymentData.updatedAt || Date.now(),
      };

      await this.getUserPaymentsRef(createdBy).child(paymentId).set(paymentToSave);

      return {
        id: paymentId,
        ...paymentToSave,
      };
    } catch (error) {
      throw new Error('Failed to create payment: ' + error.message);
    }
  }

  async updatePayment(paymentId, updateData, userId) {
    try {
      const paymentRef = this.getUserPaymentsRef(userId).child(paymentId);
      const snapshot = await paymentRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Payment not found');
      }

      const existingPayment = snapshot.val();
      const dataToUpdate = {
        ...updateData,
        updatedAt: Date.now(),
      };

      await paymentRef.update(dataToUpdate);

      return {
        id: paymentId,
        ...existingPayment,
        ...dataToUpdate,
      };
    } catch (error) {
      throw new Error('Failed to update payment: ' + error.message);
    }
  }

  async getPaymentsByCustomerId(customerId, userId) {
    try {
      const allPayments = await this.getAllPaymentsByUser(userId);
      return allPayments.filter((payment) => payment.customerId === customerId);
    } catch (error) {
      throw new Error('Failed to fetch payments by customer: ' + error.message);
    }
  }

  async getPaymentsByStatus(status, userId) {
    try {
      const allPayments = await this.getAllPaymentsByUser(userId);
      return allPayments.filter((payment) => payment.status === status);
    } catch (error) {
      throw new Error('Failed to fetch payments by status: ' + error.message);
    }
  }

  async deletePayment(paymentId, userId) {
    try {
      const paymentRef = this.getUserPaymentsRef(userId).child(paymentId);
      const snapshot = await paymentRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Payment not found');
      }

      await paymentRef.remove();
      return true;
    } catch (error) {
      throw new Error('Failed to delete payment: ' + error.message);
    }
  }
}

module.exports = new PaymentDAO();
