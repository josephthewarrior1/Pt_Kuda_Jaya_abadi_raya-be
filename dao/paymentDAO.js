const { db } = require('../config/firebase');

class PaymentDAO {
  constructor() {
    this.paymentsRootRef = db.collection('payment_records');
    this.counterRef = db.collection('counters');
  }

  getUserPaymentsRef(userId) {
    return this.paymentsRootRef.doc(userId).collection('payments');
  }

  getIdSequence(id) {
    const match = String(id).match(/(?:^|-)pay-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getNextPaymentNumber(userId) {
    try {
      const docRef = this.counterRef.doc(userId);
      const doc = await docRef.get();

      let nextNumber = 1;
      if (doc.exists) {
        nextNumber = (doc.data().paymentCount || 0) + 1;
      }

      await docRef.set({ paymentCount: nextNumber }, { merge: true });
      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next payment number: ' + error.message);
    }
  }

  async normalizePayment(paymentId, paymentData, userId) {
    return {
      id: paymentId,
      customerId: paymentData.customerId || '',
      carId: paymentData.carId || '',
      renewalId: paymentData.renewalId || '',
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
      const snapshot = await this.getUserPaymentsRef(userId).get();
      const payments = [];

      snapshot.forEach((docSnap) => {
        payments.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });

      payments.sort((a, b) => {
        return this.getIdSequence(b.id) - this.getIdSequence(a.id);
      });

      return payments.map((payment) => ({
        id: payment.id,
        customerId: payment.customerId || '',
        carId: payment.carId || '',
        renewalId: payment.renewalId || '',
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
      const doc = await this.getUserPaymentsRef(userId).doc(paymentId).get();

      if (!doc.exists) {
        return null;
      }

      return this.normalizePayment(paymentId, doc.data(), userId);
    } catch (error) {
      throw new Error('Failed to fetch payment: ' + error.message);
    }
  }

  async createPayment(paymentData) {
    try {
      const { createdBy } = paymentData;
      const nextNumber = await this.getNextPaymentNumber(createdBy);
      const paymentId = `pay-${nextNumber}`;
      const paymentToSave = {
        customerId: paymentData.customerId || '',
        carId: paymentData.carId || '',
        renewalId: paymentData.renewalId || '',
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

      await this.getUserPaymentsRef(createdBy).doc(paymentId).set(paymentToSave);

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
      const paymentRef = this.getUserPaymentsRef(userId).doc(paymentId);
      const doc = await paymentRef.get();

      if (!doc.exists) {
        throw new Error('Payment not found');
      }

      const existingPayment = doc.data();
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
      const paymentRef = this.getUserPaymentsRef(userId).doc(paymentId);
      const doc = await paymentRef.get();

      if (!doc.exists) {
        throw new Error('Payment not found');
      }

      await paymentRef.delete();
      return true;
    } catch (error) {
      throw new Error('Failed to delete payment: ' + error.message);
    }
  }
}

module.exports = new PaymentDAO();
