const { db } = require('../config/firebase');

class CustomerDAO {
  constructor() {
    this.customersRootRef = db.ref('customer_data');
    this.customerCountRef = db.ref('customer_counters'); // Untuk tracking jumlah customer per user
  }

  // Get reference untuk customer collection user tertentu
  getUserCustomersRef(userId) {
    return this.customersRootRef.child(userId);
  }

  // Get next customer number untuk user
  async getNextCustomerNumber(userId) {
    try {
      const counterRef = this.customerCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }
      
      // Update counter
      await counterRef.set(nextNumber);
      
      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next customer number: ' + error.message);
    }
  }

  // Get current customer number (tanpa increment)
  async getCurrentCustomerNumber(userId) {
    try {
      const counterRef = this.customerCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      return snapshot.exists() ? snapshot.val() : 0;
    } catch (error) {
      throw new Error('Failed to get current customer number: ' + error.message);
    }
  }

  // Get all customers by user ID
  async getAllCustomersByUser(userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      const snapshot = await userCustomersRef.once('value');
      
      const customers = [];
      snapshot.forEach((childSnapshot) => {
        customers.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
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
      const userCustomersRef = this.getUserCustomersRef(userId);
      const snapshot = await userCustomersRef.child(customerId).once('value');
      
      if (!snapshot.exists()) {
        return null;
      }
      
      return {
        id: customerId,
        ...snapshot.val(),
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
      
      // Simpan customer di path: customer_data/{userId}/{customerId}
      await userCustomersRef.child(customerId).set(customerDataWithoutCreatedBy);
      
      return {
        id: customerId,
        ...customerData,
      };
    } catch (error) {
      throw new Error('Failed to create customer: ' + error.message);
    }
  }

  // Update customer
  async updateCustomer(customerId, updateData, userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      
      // Cek apakah customer ada
      const snapshot = await userCustomersRef.child(customerId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Customer not found');
      }
      
      const existingCustomer = snapshot.val();
      
      // Handle nested carData update
      let dataToUpdate = { ...updateData };
      
      // If updating carData, merge with existing carData
      if (updateData.carData && existingCustomer.carData) {
        dataToUpdate.carData = {
          ...existingCustomer.carData,
          ...updateData.carData
        };
      }
      
      // If updating carPhotos, merge with existing carPhotos
      if (updateData.carPhotos && existingCustomer.carPhotos) {
        dataToUpdate.carPhotos = {
          ...existingCustomer.carPhotos,
          ...updateData.carPhotos
        };
      }
      
      // Add updatedAt timestamp
      dataToUpdate.updatedAt = Date.now();
      
      await userCustomersRef.child(customerId).update(dataToUpdate);
      
      return {
        id: customerId,
        ...existingCustomer,
        ...dataToUpdate,
      };
    } catch (error) {
      throw new Error('Failed to update customer: ' + error.message);
    }
  }

  // Delete customer
  async deleteCustomer(customerId, userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      
      // Cek apakah customer ada
      const snapshot = await userCustomersRef.child(customerId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Customer not found');
      }
      
      await userCustomersRef.child(customerId).remove();
      
      // Note: Kita TIDAK mengurangi counter karena nomor harus tetap sequential
      // Meskipun customer dihapus, nomor berikutnya tetap increment
      
      return true;
    } catch (error) {
      throw new Error('Failed to delete customer: ' + error.message);
    }
  }

  // Get customer count for user
  async getCustomerCount(userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      const snapshot = await userCustomersRef.once('value');
      
      return snapshot.numChildren();
    } catch (error) {
      throw new Error('Failed to get customer count: ' + error.message);
    }
  }
}

module.exports = new CustomerDAO();