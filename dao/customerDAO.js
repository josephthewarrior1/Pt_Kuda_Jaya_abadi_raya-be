const { db } = require('../config/firebase');

class CustomerDAO {
  constructor() {
    this.customersRootRef = db.collection('customer_data');
    this.customerCountRef = db.collection('customer_counters');
  }

  // Get reference untuk customer collection user tertentu
  getUserCustomersRef(userId) {
    return this.customersRootRef.doc(userId).collection('customers');
  }

  // Get next customer number untuk user
  async getNextCustomerNumber(userId) {
    try {
      const docRef = this.customerCountRef.doc(userId);
      const doc = await docRef.get();

      let nextNumber = 1;
      if (doc.exists) {
        nextNumber = (doc.data().count || 0) + 1;
      }

      // Update counter
      await docRef.set({ count: nextNumber });

      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next customer number: ' + error.message);
    }
  }

  // Get current customer number (tanpa increment)
  async getCurrentCustomerNumber(userId) {
    try {
      const doc = await this.customerCountRef.doc(userId).get();
      return doc.exists ? (doc.data().count || 0) : 0;
    } catch (error) {
      throw new Error('Failed to get current customer number: ' + error.message);
    }
  }

  // Get all customers by user ID
  async getAllCustomersByUser(userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      const snapshot = await userCustomersRef.get();

      const customers = [];
      snapshot.forEach((docSnap) => {
        const customerData = docSnap.data();

        customers.push({
          id: docSnap.id,
          name: customerData.name || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
          address: customerData.address || '',
          notes: customerData.notes || '',
          status: customerData.status || null,
          createdBy: customerData.createdBy || userId,
          createdAt: customerData.createdAt || Date.now(),
          updatedAt: customerData.updatedAt || Date.now(),
        });
      });

      // Sort by customer number
      customers.sort((a, b) => {
        const numA = parseInt(a.id.split('-')[1] || 0);
        const numB = parseInt(b.id.split('-')[1] || 0);
        return numA - numB;
      });

      return customers;
    } catch (error) {
      throw new Error('Failed to fetch customers by user: ' + error.message);
    }
  }

  // Get customer by ID and user ID
  async getCustomerById(customerId, userId) {
    try {
      const doc = await this.getUserCustomersRef(userId).doc(customerId).get();

      if (!doc.exists) {
        return null;
      }

      const customerData = doc.data();

      return {
        id: customerId,
        name: customerData.name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        notes: customerData.notes || '',
        status: customerData.status || null,
        createdBy: customerData.createdBy || userId,
        createdAt: customerData.createdAt || Date.now(),
        updatedAt: customerData.updatedAt || Date.now(),
      };
    } catch (error) {
      throw new Error('Failed to fetch customer: ' + error.message);
    }
  }

  // Create new customer dengan ID format: {username}-{number}
  async createCustomer(customerData) {
    try {
      const { createdBy } = customerData;

      // Get next customer number untuk user ini
      const nextNumber = await this.getNextCustomerNumber(createdBy);

      // Generate customer ID: {username}-{number}
      const customerId = `${createdBy}-${nextNumber}`;

      // Hapus createdBy dari customerData karena sudah di path
      const { createdBy: _, ...customerDataWithoutCreatedBy } = customerData;

      const userCustomersRef = this.getUserCustomersRef(createdBy);

      const customerToSave = {
        name: customerDataWithoutCreatedBy.name || '',
        email: customerDataWithoutCreatedBy.email || '',
        phone: customerDataWithoutCreatedBy.phone || '',
        address: customerDataWithoutCreatedBy.address || '',
        notes: customerDataWithoutCreatedBy.notes || '',
        status: customerDataWithoutCreatedBy.status || null,
        createdAt: customerDataWithoutCreatedBy.createdAt || Date.now(),
        updatedAt: customerDataWithoutCreatedBy.updatedAt || Date.now(),
      };

      await userCustomersRef.doc(customerId).set(customerToSave);

      return {
        id: customerId,
        ...customerToSave,
      };
    } catch (error) {
      throw new Error('Failed to create customer: ' + error.message);
    }
  }

  // Update customer
  async updateCustomer(customerId, updateData, userId) {
    try {
      const docRef = this.getUserCustomersRef(userId).doc(customerId);

      // Cek apakah customer ada
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('Customer not found');
      }

      const existingCustomer = doc.data();

      const updates = {};
      console.log('🔥 DAO updateCustomer called:', customerId, JSON.stringify(updateData)); 

      if (updateData.name !== undefined) updates['name'] = updateData.name;
      if (updateData.email !== undefined) updates['email'] = updateData.email;
      if (updateData.phone !== undefined) updates['phone'] = updateData.phone;
      if (updateData.address !== undefined) updates['address'] = updateData.address;
      if (updateData.notes !== undefined) updates['notes'] = updateData.notes;

      // Status field
      if ('status' in updateData) {
        if (updateData.status === null || updateData.status === undefined) {
           updates['status'] = null; // Firestore can store null
        } else {
          updates['status'] = updateData.status;
        }
      }

      // Timestamp
      updates['updatedAt'] = Date.now();

      await docRef.update(updates);

      return {
        id: customerId,
        ...existingCustomer,
        ...updateData,
        updatedAt: updates['updatedAt'],
      };
    } catch (error) {
      throw new Error('Failed to update customer: ' + error.message);
    }
  }

  // Delete customer
  async deleteCustomer(customerId, userId) {
    try {
      const docRef = this.getUserCustomersRef(userId).doc(customerId);

      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('Customer not found');
      }

      await docRef.delete();

      return true;
    } catch (error) {
      throw new Error('Failed to delete customer: ' + error.message);
    }
  }

  // Get customer count for user
  async getCustomerCount(userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      // Wait, Firestore doesn't have an efficient count natively unless using count() query
      // but doc.data().count works if we use counter
      const doc = await this.customerCountRef.doc(userId).get();
      return doc.exists ? (doc.data().count || 0) : 0;
    } catch (error) {
      throw new Error('Failed to get customer count: ' + error.message);
    }
  }
}

module.exports = new CustomerDAO();