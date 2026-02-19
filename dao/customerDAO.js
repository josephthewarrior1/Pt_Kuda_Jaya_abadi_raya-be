const { db } = require('../config/firebase');

class CustomerDAO {
  constructor() {
    this.customersRootRef = db.ref('customer_data');
    this.customerCountRef = db.ref('customer_counters');
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
        const customerData = childSnapshot.val();
        
        customers.push({
          id: childSnapshot.key,
          name: customerData.name || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
          address: customerData.address || '',
          notes: customerData.notes || '',
          // ✅ TAMBAHAN: status field - null berarti pakai date-based logic di frontend
          status: customerData.status || null,
          carData: customerData.carData || {
            ownerName: '',
            carBrand: '',
            carModel: '',
            plateNumber: '',
            chassisNumber: '',
            engineNumber: '',
            dueDate: null,
            carPrice: 0
          },
          documentStatus: customerData.documentStatus || {
            hasSTNK: false,
            hasSIM: false,
            hasKTP: false
          },
          carPhotos: customerData.carPhotos || {
            leftSide: '',
            rightSide: '',
            front: '',
            back: ''
          },
          documentPhotos: customerData.documentPhotos || {
            stnk: '',
            sim: '',
            ktp: ''
          },
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
      const userCustomersRef = this.getUserCustomersRef(userId);
      const snapshot = await userCustomersRef.child(customerId).once('value');
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const customerData = snapshot.val();
      
      return {
        id: customerId,
        name: customerData.name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        notes: customerData.notes || '',
        // ✅ TAMBAHAN: status field
        status: customerData.status || null,
        carData: customerData.carData || {
          ownerName: '',
          carBrand: '',
          carModel: '',
          plateNumber: '',
          chassisNumber: '',
          engineNumber: '',
          dueDate: null,
          carPrice: 0
        },
        documentStatus: customerData.documentStatus || {
          hasSTNK: false,
          hasSIM: false,
          hasKTP: false
        },
        carPhotos: customerData.carPhotos || {
          leftSide: '',
          rightSide: '',
          front: '',
          back: ''
        },
        documentPhotos: customerData.documentPhotos || {
          stnk: '',
          sim: '',
          ktp: ''
        },
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
        // ✅ TAMBAHAN: simpan status (null by default)
        status: customerDataWithoutCreatedBy.status || null,
        carData: customerDataWithoutCreatedBy.carData || {
          ownerName: customerDataWithoutCreatedBy.name || '',
          carBrand: '',
          carModel: '',
          plateNumber: '',
          chassisNumber: '',
          engineNumber: '',
          dueDate: null,
          carPrice: 0
        },
        documentStatus: customerDataWithoutCreatedBy.documentStatus || {
          hasSTNK: false,
          hasSIM: false,
          hasKTP: false
        },
        carPhotos: customerDataWithoutCreatedBy.carPhotos || {
          leftSide: '',
          rightSide: '',
          front: '',
          back: ''
        },
        documentPhotos: customerDataWithoutCreatedBy.documentPhotos || {
          stnk: '',
          sim: '',
          ktp: ''
        },
        createdAt: customerDataWithoutCreatedBy.createdAt || Date.now(),
        updatedAt: customerDataWithoutCreatedBy.updatedAt || Date.now(),
      };
      
      await userCustomersRef.child(customerId).set(customerToSave);
      
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
      const userCustomersRef = this.getUserCustomersRef(userId);
      
      // Cek apakah customer ada
      const snapshot = await userCustomersRef.child(customerId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Customer not found');
      }
      
      const existingCustomer = snapshot.val();
      
      let dataToUpdate = { ...updateData };
      
      // If updating carData, merge with existing carData
      if (updateData.carData) {
        dataToUpdate.carData = {
          ownerName: existingCustomer.carData?.ownerName || '',
          carBrand: existingCustomer.carData?.carBrand || '',
          carModel: existingCustomer.carData?.carModel || '',
          plateNumber: existingCustomer.carData?.plateNumber || '',
          chassisNumber: existingCustomer.carData?.chassisNumber || '',
          engineNumber: existingCustomer.carData?.engineNumber || '',
          dueDate: existingCustomer.carData?.dueDate || null,
          carPrice: existingCustomer.carData?.carPrice || 0,
          ...updateData.carData
        };
      }
      
      // If updating documentStatus, merge with existing documentStatus
      if (updateData.documentStatus) {
        dataToUpdate.documentStatus = {
          hasSTNK: existingCustomer.documentStatus?.hasSTNK || false,
          hasSIM: existingCustomer.documentStatus?.hasSIM || false,
          hasKTP: existingCustomer.documentStatus?.hasKTP || false,
          ...updateData.documentStatus
        };
      }
      
      // If updating carPhotos, merge with existing carPhotos
      if (updateData.carPhotos) {
        dataToUpdate.carPhotos = {
          leftSide: existingCustomer.carPhotos?.leftSide || '',
          rightSide: existingCustomer.carPhotos?.rightSide || '',
          front: existingCustomer.carPhotos?.front || '',
          back: existingCustomer.carPhotos?.back || '',
          ...updateData.carPhotos
        };
      }
      
      // If updating documentPhotos, merge with existing documentPhotos
      if (updateData.documentPhotos) {
        dataToUpdate.documentPhotos = {
          stnk: existingCustomer.documentPhotos?.stnk || '',
          sim: existingCustomer.documentPhotos?.sim || '',
          ktp: existingCustomer.documentPhotos?.ktp || '',
          ...updateData.documentPhotos
        };
      }

      // ✅ TAMBAHAN: Handle status update
      // Firebase Realtime DB ga bisa simpan null langsung, jadi kita hapus field-nya kalau null
      // Ini berarti status "reset" = field dihapus dari DB = frontend akan hitung dari dueDate
      if ('status' in dataToUpdate) {
        if (dataToUpdate.status === null || dataToUpdate.status === undefined) {
          // Hapus field status dari DB (reset ke date-based logic)
          await userCustomersRef.child(customerId).child('status').remove();
          delete dataToUpdate.status;
        }
        // Kalau 'Cancelled', biarkan masuk ke update normal di bawah
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