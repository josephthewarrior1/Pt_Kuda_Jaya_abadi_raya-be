const { db } = require('../config/firebase');

class RenewalDAO {
  constructor() {
    this.renewalsRootRef = db.ref('renewal_records');
    this.renewalCountRef = db.ref('renewal_counters');
  }

  getUserRenewalsRef(userId) {
    return this.renewalsRootRef.child(userId);
  }

  async getNextRenewalNumber(userId) {
    try {
      const counterRef = this.renewalCountRef.child(userId);
      const snapshot = await counterRef.once('value');

      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }

      await counterRef.set(nextNumber);
      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next renewal number: ' + error.message);
    }
  }

  normalizeRenewal(renewalId, renewalData, userId) {
    return {
      id: renewalId,
      customerId: renewalData.customerId || '',
      policyType: renewalData.policyType || '',
      policyId: renewalData.policyId || '',
      paymentId: renewalData.paymentId || '',
      oldStartDate: renewalData.oldStartDate || null,
      oldEndDate: renewalData.oldEndDate || null,
      newStartDate: renewalData.newStartDate || null,
      newEndDate: renewalData.newEndDate || null,
      premium: renewalData.premium || 0,
      status: renewalData.status || 'Pending',
      notes: renewalData.notes || '',
      completedAt: renewalData.completedAt || null,
      createdBy: renewalData.createdBy || userId,
      createdAt: renewalData.createdAt || Date.now(),
      updatedAt: renewalData.updatedAt || Date.now(),
    };
  }

  async getAllRenewalsByUser(userId) {
    try {
      const snapshot = await this.getUserRenewalsRef(userId).once('value');
      const renewals = [];

      snapshot.forEach((childSnapshot) => {
        renewals.push(this.normalizeRenewal(childSnapshot.key, childSnapshot.val(), userId));
      });

      renewals.sort((a, b) => {
        const numA = parseInt((a.id.split('-ren-')[1] || '0'), 10);
        const numB = parseInt((b.id.split('-ren-')[1] || '0'), 10);
        return numB - numA;
      });

      return renewals;
    } catch (error) {
      throw new Error('Failed to fetch renewals by user: ' + error.message);
    }
  }

  async getRenewalById(renewalId, userId) {
    try {
      const snapshot = await this.getUserRenewalsRef(userId).child(renewalId).once('value');
      if (!snapshot.exists()) {
        return null;
      }

      return this.normalizeRenewal(renewalId, snapshot.val(), userId);
    } catch (error) {
      throw new Error('Failed to fetch renewal: ' + error.message);
    }
  }

  async createRenewal(renewalData) {
    try {
      const nextNumber = await this.getNextRenewalNumber(renewalData.createdBy);
      const renewalId = `${renewalData.createdBy}-ren-${nextNumber}`;
      const renewalToSave = this.normalizeRenewal(renewalId, renewalData, renewalData.createdBy);

      await this.getUserRenewalsRef(renewalData.createdBy).child(renewalId).set({
        customerId: renewalToSave.customerId,
        policyType: renewalToSave.policyType,
        policyId: renewalToSave.policyId,
        paymentId: renewalToSave.paymentId,
        oldStartDate: renewalToSave.oldStartDate,
        oldEndDate: renewalToSave.oldEndDate,
        newStartDate: renewalToSave.newStartDate,
        newEndDate: renewalToSave.newEndDate,
        premium: renewalToSave.premium,
        status: renewalToSave.status,
        notes: renewalToSave.notes,
        completedAt: renewalToSave.completedAt,
        createdBy: renewalToSave.createdBy,
        createdAt: renewalToSave.createdAt,
        updatedAt: renewalToSave.updatedAt,
      });

      return renewalToSave;
    } catch (error) {
      throw new Error('Failed to create renewal: ' + error.message);
    }
  }

  async updateRenewal(renewalId, updateData, userId) {
    try {
      const renewalRef = this.getUserRenewalsRef(userId).child(renewalId);
      const snapshot = await renewalRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Renewal not found');
      }

      const existingRenewal = snapshot.val();
      const dataToUpdate = {
        ...updateData,
        updatedAt: Date.now(),
      };

      await renewalRef.update(dataToUpdate);

      return this.normalizeRenewal(renewalId, {
        ...existingRenewal,
        ...dataToUpdate,
      }, userId);
    } catch (error) {
      throw new Error('Failed to update renewal: ' + error.message);
    }
  }

  async getRenewalsByStatus(status, userId) {
    try {
      const renewals = await this.getAllRenewalsByUser(userId);
      return renewals.filter((renewal) => renewal.status === status);
    } catch (error) {
      throw new Error('Failed to fetch renewals by status: ' + error.message);
    }
  }

  async getRenewalsByCustomerId(customerId, userId) {
    try {
      const renewals = await this.getAllRenewalsByUser(userId);
      return renewals.filter((renewal) => renewal.customerId === customerId);
    } catch (error) {
      throw new Error('Failed to fetch renewals by customer: ' + error.message);
    }
  }
}

module.exports = new RenewalDAO();
