const { db } = require('../config/firebase');

class InvoiceDAO {
  constructor() {
    this.invoicesRootRef = db.ref('invoice_records');
    this.invoiceCountRef = db.ref('invoice_counters');
  }

  getUserInvoicesRef(userId) {
    return this.invoicesRootRef.child(userId);
  }

  // Get next invoice number for user
  async getNextInvoiceNumber(userId) {
    try {
      const counterRef = this.invoiceCountRef.child(userId);
      const snapshot = await counterRef.once('value');

      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }

      // Update counter
      await counterRef.set(nextNumber);

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

  // Get all invoices by user
  async getAllInvoicesByUser(userId) {
    try {
      const snapshot = await this.getUserInvoicesRef(userId).once('value');
      const invoices = [];

      snapshot.forEach((childSnapshot) => {
        invoices.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
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
      const snapshot = await this.getUserInvoicesRef(userId).child(invoiceId).once('value');

      if (!snapshot.exists()) {
        return null;
      }

      return this.normalizeInvoice(invoiceId, snapshot.val(), userId);
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

      await this.getUserInvoicesRef(createdBy).child(invoiceId).set(invoiceToSave);

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
      const invoiceRef = this.getUserInvoicesRef(userId).child(invoiceId);
      const snapshot = await invoiceRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const existingInvoice = snapshot.val();
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
