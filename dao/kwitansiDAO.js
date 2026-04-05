const { db } = require('../config/firebase');

class KwitansiDAO {
  constructor() {
    this.kwitansiRootRef = db.ref('kwitansi_records');
    this.kwitansiCountRef = db.ref('kwitansi_counters');
  }

  getUserKwitansiRef(userId) {
    return this.kwitansiRootRef.child(userId);
  }

  // Get next kwitansi number for user
  async getNextKwitansiNumber(userId) {
    try {
      const counterRef = this.kwitansiCountRef.child(userId);
      const snapshot = await counterRef.once('value');

      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }

      await counterRef.set(nextNumber);

      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next kwitansi number: ' + error.message);
    }
  }

  normalizeKwitansi(kwitansiId, data, userId) {
    return {
      id: kwitansiId,
      kwitansiNumber: data.kwitansiNumber || '',
      paymentId: data.paymentId || '',
      invoiceData: data.invoiceData || null, // Snapshot of invoice specifics
      issuedDate: data.issuedDate || Date.now(),
      printedBy: data.printedBy || userId,
      printCount: data.printCount || 1,
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
    };
  }

  async getAllKwitansiByUser(userId) {
    try {
      const snapshot = await this.getUserKwitansiRef(userId).once('value');
      const kwitansis = [];

      snapshot.forEach((childSnapshot) => {
        kwitansis.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });

      // Sort descending
      kwitansis.sort((a, b) => {
        const numA = parseInt((a.id.split('-kwt-')[1] || '0'), 10);
        const numB = parseInt((b.id.split('-kwt-')[1] || '0'), 10);
        return numB - numA;
      });

      return kwitansis.map(k => this.normalizeKwitansi(k.id, k, userId));
    } catch (error) {
      throw new Error('Failed to fetch kwitansi by user: ' + error.message);
    }
  }

  async getKwitansiById(kwitansiId, userId) {
    try {
      const snapshot = await this.getUserKwitansiRef(userId).child(kwitansiId).once('value');

      if (!snapshot.exists()) {
        return null;
      }

      return this.normalizeKwitansi(kwitansiId, snapshot.val(), userId);
    } catch (error) {
      throw new Error('Failed to fetch kwitansi: ' + error.message);
    }
  }
  
  async getKwitansiByPaymentId(paymentId, userId) {
    try {
      const allKwitansi = await this.getAllKwitansiByUser(userId);
      return allKwitansi.find(k => k.paymentId === paymentId) || null;
    } catch (error) {
      throw new Error('Failed to fetch kwitansi by payment ID: ' + error.message);
    }
  }

  async createKwitansi(kwitansiData) {
    try {
      const { createdBy } = kwitansiData;
      const nextNumber = await this.getNextKwitansiNumber(createdBy);
      
      const kwitansiId = `${createdBy}-kwt-${nextNumber}`;
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const recordToSave = {
        kwitansiNumber: `KWT/${year}/${month}/${String(nextNumber).padStart(3, '0')}`,
        paymentId: kwitansiData.paymentId,
        invoiceData: kwitansiData.invoiceData || null,
        issuedDate: Date.now(),
        printedBy: createdBy,
        printCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await this.getUserKwitansiRef(createdBy).child(kwitansiId).set(recordToSave);

      return {
        id: kwitansiId,
        ...recordToSave,
      };
    } catch (error) {
      throw new Error('Failed to create kwitansi: ' + error.message);
    }
  }

  async incrementPrintCount(kwitansiId, userId) {
    try {
      const kwitansiRef = this.getUserKwitansiRef(userId).child(kwitansiId);
      const snapshot = await kwitansiRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Kwitansi not found');
      }

      const existingData = snapshot.val();
      const newCount = (existingData.printCount || 0) + 1;
      
      const dataToUpdate = {
        printCount: newCount,
        updatedAt: Date.now(),
      };

      await kwitansiRef.update(dataToUpdate);

      return {
        id: kwitansiId,
        ...existingData,
        ...dataToUpdate,
      };
    } catch (error) {
      throw new Error('Failed to update kwitansi print count: ' + error.message);
    }
  }
}

module.exports = new KwitansiDAO();
