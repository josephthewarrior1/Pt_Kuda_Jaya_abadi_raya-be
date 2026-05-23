const { db } = require('../config/firebase');

class QuotationDAO {
  constructor() {
    this.quotationsRootRef = db.collection('quotation_records');
  }

  getUserQuotationsRef(userId) {
    return this.quotationsRootRef.doc(userId).collection('quotations');
  }

  async createQuotation(data, userId) {
    const userQuotationsRef = this.getUserQuotationsRef(userId);
    const docRef = userQuotationsRef.doc();
    const now = new Date().toISOString();
    const newQuotation = {
      ...data,
      id: docRef.id,
      status: 'Pending',
      createdAt: now,
      updatedAt: now
    };
    await docRef.set(newQuotation);
    return newQuotation;
  }

  async getQuotationsByCarId(carId, userId) {
    const snapshot = await this.getUserQuotationsRef(userId)
      .where('carId', '==', carId)
      .get();
    
    if (snapshot.empty) return [];
    
    const quotations = [];
    snapshot.forEach(doc => {
      quotations.push(doc.data());
    });
    
    quotations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return quotations;
  }

  async getQuotationById(id, userId) {
    const doc = await this.getUserQuotationsRef(userId).doc(id).get();
    if (!doc.exists) return null;
    return doc.data();
  }

  async updateQuotation(id, data, userId) {
    const docRef = this.getUserQuotationsRef(userId).doc(id);
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await docRef.update(updateData);
    
    const doc = await docRef.get();
    return doc.data();
  }

  async deleteQuotation(id, userId) {
    await this.getUserQuotationsRef(userId).doc(id).delete();
    return true;
  }

  async deletePendingQuotationsExcept(carId, keepId, userId) {
    const snapshot = await this.getUserQuotationsRef(userId)
      .where('carId', '==', carId)
      .get();
      
    if (snapshot.empty) return 0;

    let count = 0;
    const batch = db.batch(); // Firestore batch write
    
    snapshot.forEach(docSnap => {
      const val = docSnap.data();
      if (val.status === 'Pending' && docSnap.id !== keepId) {
        batch.delete(docSnap.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  }
}

module.exports = new QuotationDAO();
