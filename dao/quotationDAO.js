const { db } = require('../config/firebase');

class QuotationDAO {
  constructor() {
    this.quotationsRef = db.collection('quotations');
  }

  async createQuotation(data) {
    const docRef = this.quotationsRef.doc();
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

  async getQuotationsByPolicy(policyId) {
    const snapshot = await this.quotationsRef
      .where('policyId', '==', policyId)
      .get();
    
    if (snapshot.empty) return [];
    
    const quotations = [];
    snapshot.forEach(doc => {
      quotations.push(doc.data());
    });
    
    quotations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return quotations;
  }

  async getQuotationById(id) {
    const doc = await this.quotationsRef.doc(id).get();
    if (!doc.exists) return null;
    return doc.data();
  }

  async updateQuotation(id, data) {
    const docRef = this.quotationsRef.doc(id);
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await docRef.update(updateData);
    
    const doc = await docRef.get();
    return doc.data();
  }

  async deleteQuotation(id) {
    await this.quotationsRef.doc(id).delete();
    return true;
  }

  async deletePendingQuotationsExcept(policyId, keepId) {
    const snapshot = await this.quotationsRef
      .where('policyId', '==', policyId)
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
