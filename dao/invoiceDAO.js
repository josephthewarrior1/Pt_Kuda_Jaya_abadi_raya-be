const { db } = require('../config/firebase');

class InvoiceDAO {
  constructor() {
    this.invoicesRootRef = db.collection('invoice_records');
    this.invoiceCountRef = db.collection('invoice_counters');
  }

  getUserInvoicesRef(userId) {
    return this.invoicesRootRef.doc(userId).collection('invoices');
  }

  // Get next invoice number for user
  async getNextInvoiceNumber(userId) {
    try {
      const docRef = this.invoiceCountRef.doc(userId);
      const doc = await docRef.get();

      let nextNumber = 1;
      if (doc.exists) {
        nextNumber = (doc.data().count || 0) + 1;
      }

      // Update counter
      await docRef.set({ count: nextNumber });

      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next invoice number: ' + error.message);
    }
  }

  // Helper mapping
  normalizeInvoice(invoiceId, invoiceData, userId) {
    return {
      id: invoiceId,
      invoiceNumber: invoiceData.invoiceNumber || '',
      customerId: invoiceData.customerId || '',
      customerName: invoiceData.customerName || '',
      carId: invoiceData.carId || '',
      plateNumber: invoiceData.plateNumber || '',
      items: invoiceData.items || [],
      subTotal: invoiceData.subTotal || 0,
      discount: invoiceData.discount || 0,
      grandTotal: invoiceData.grandTotal || 0,
      issueDate: invoiceData.issueDate || Date.now(),
      dueDate: invoiceData.dueDate || Date.now(),
      status: invoiceData.status || 'Unpaid',
      notes: invoiceData.notes || '',
      createdBy: invoiceData.createdBy || userId,
      createdAt: invoiceData.createdAt || Date.now(),
      updatedAt: invoiceData.updatedAt || Date.now(),
    };
  }

  // Get active unpaid invoice for a specific policy (car or property)
  async getUnpaidInvoiceByPolicy(policyType, policyId, userId) {
    try {
      const fieldName = policyType === 'car' ? 'carId' : 'propertyId';
      if (!policyId) return null;

      const snapshot = await this.getUserInvoicesRef(userId)
        .where(fieldName, '==', policyId)
        .where('status', '==', 'Unpaid')
        .get();

      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return this.normalizeInvoice(doc.id, doc.data(), userId);
    } catch (error) {
      throw new Error('Failed to fetch unpaid invoice for policy: ' + error.message);
    }
  }

  // Get all invoices by user
  async getAllInvoicesByUser(userId) {
    try {
      const snapshot = await this.getUserInvoicesRef(userId).get();
      const invoices = [];

      snapshot.forEach((docSnap) => {
        invoices.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });

      // Sort descending by id sequence
      invoices.sort((a, b) => {
        const numA = parseInt((a.id.split('-inv-')[1] || '0'), 10);
        const numB = parseInt((b.id.split('-inv-')[1] || '0'), 10);
        return numB - numA;
      });

      return invoices.map((invoice) => this.normalizeInvoice(invoice.id, invoice, userId));
    } catch (error) {
      throw new Error('Failed to fetch invoices by user: ' + error.message);
    }
  }

  // Get invoice by ID
  async getInvoiceById(invoiceId, userId) {
    try {
      const doc = await this.getUserInvoicesRef(userId).doc(invoiceId).get();

      if (!doc.exists) {
        return null;
      }

      return this.normalizeInvoice(invoiceId, doc.data(), userId);
    } catch (error) {
      throw new Error('Failed to fetch invoice: ' + error.message);
    }
  }

  // Create new invoice
  async createInvoice(invoiceData) {
    try {
      const { createdBy } = invoiceData;
      const nextNumber = await this.getNextInvoiceNumber(createdBy);
      
      const invoiceId = `${createdBy}-inv-${nextNumber}`;
      
      const invoiceToSave = {
        invoiceNumber: invoiceData.invoiceNumber || `INV-${nextNumber}`,
        customerId: invoiceData.customerId || '',
        customerName: invoiceData.customerName || '',
        carId: invoiceData.carId || '',
        plateNumber: invoiceData.plateNumber || '',
        items: invoiceData.items || [],
        subTotal: invoiceData.subTotal || 0,
        discount: invoiceData.discount || 0,
        grandTotal: invoiceData.grandTotal || 0,
        issueDate: invoiceData.issueDate || Date.now(),
        dueDate: invoiceData.dueDate || Date.now(),
        status: invoiceData.status || 'Unpaid',
        notes: invoiceData.notes || '',
        createdBy: createdBy,
        createdAt: invoiceData.createdAt || Date.now(),
        updatedAt: invoiceData.updatedAt || Date.now(),
      };

      await this.getUserInvoicesRef(createdBy).doc(invoiceId).set(invoiceToSave);

      return {
        id: invoiceId,
        ...invoiceToSave,
      };
    } catch (error) {
      throw new Error('Failed to create invoice: ' + error.message);
    }
  }

  // Update invoice
  async updateInvoice(invoiceId, updateData, userId) {
    try {
      const invoiceRef = this.getUserInvoicesRef(userId).doc(invoiceId);
      const doc = await invoiceRef.get();

      if (!doc.exists) {
        throw new Error('Invoice not found');
      }

      const existingInvoice = doc.data();
      const dataToUpdate = {
        ...updateData,
        updatedAt: Date.now(),
      };

      await invoiceRef.update(dataToUpdate);

      return {
        id: invoiceId,
        ...existingInvoice,
        ...dataToUpdate,
      };
    } catch (error) {
      throw new Error('Failed to update invoice: ' + error.message);
    }
  }
}

module.exports = new InvoiceDAO();
