const { db } = require('../config/firebase');

class RenewalDAO {
  constructor() {
    this.renewalsRootRef = db.collection('renewal_records');
    this.counterRef = db.collection('counters');
  }

  getUserRenewalsRef(userId) {
    return this.renewalsRootRef.doc(userId).collection('renewals');
  }

  getIdSequence(id) {
    const match = String(id).match(/(?:^|-)ren-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getNextRenewalNumber(userId) {
    try {
      const docRef = this.counterRef.doc(userId);
      const doc = await docRef.get();

      let nextNumber = 1;
      if (doc.exists) {
        nextNumber = (doc.data().renewalCount || 0) + 1;
      }

      await docRef.set({ renewalCount: nextNumber }, { merge: true });
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
      const snapshot = await this.getUserRenewalsRef(userId).get();
      const renewals = [];

      snapshot.forEach((docSnap) => {
        renewals.push(this.normalizeRenewal(docSnap.id, docSnap.data(), userId));
      });

      renewals.sort((a, b) => {
        return this.getIdSequence(b.id) - this.getIdSequence(a.id);
      });

      return renewals;
    } catch (error) {
      throw new Error('Failed to fetch renewals by user: ' + error.message);
    }
  }

  async getRenewalById(renewalId, userId) {
    try {
      const doc = await this.getUserRenewalsRef(userId).doc(renewalId).get();
      if (!doc.exists) {
        return null;
      }

      return this.normalizeRenewal(renewalId, doc.data(), userId);
    } catch (error) {
      throw new Error('Failed to fetch renewal: ' + error.message);
    }
  }

  async createRenewal(renewalData) {
    try {
      const nextNumber = await this.getNextRenewalNumber(renewalData.createdBy);
      const renewalId = `ren-${nextNumber}`;
      const renewalToSave = this.normalizeRenewal(renewalId, renewalData, renewalData.createdBy);

      await this.getUserRenewalsRef(renewalData.createdBy).doc(renewalId).set({
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
      const renewalRef = this.getUserRenewalsRef(userId).doc(renewalId);
      const doc = await renewalRef.get();

      if (!doc.exists) {
        throw new Error('Renewal not found');
      }

      const existingRenewal = doc.data();
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

  // Returns the first active (Pending/Approved) renewal for a given policyId
  async getActivePendingRenewalByPolicy(policyId, userId) {
    try {
      const snapshot = await this.getUserRenewalsRef(userId)
        .where('policyId', '==', policyId)
        .where('status', 'in', ['Pending', 'Approved'])
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return this.normalizeRenewal(doc.id, doc.data(), userId);
    } catch (error) {
      throw new Error('Failed to check active renewal: ' + error.message);
    }
  }
}

module.exports = new RenewalDAO();
