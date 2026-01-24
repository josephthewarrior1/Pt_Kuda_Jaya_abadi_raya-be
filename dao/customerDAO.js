const { db } = require('../config/firebase');

class CustomerDAO {
  constructor() {
    this.customersRootRef = db.ref('customer_data');
    this.customerCountRef = db.ref('customer_counters');
  }

  getUserCustomersRef(userId) {
    return this.customersRootRef.child(userId);
  }

  async getNextCustomerNumber(userId) {
    try {
      const counterRef = this.customerCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }
      
      await counterRef.set(nextNumber);
      
      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next customer number: ' + error.message);
    }
  }

  async getCurrentCustomerNumber(userId) {
    try {
      const counterRef = this.customerCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      return snapshot.exists() ? snapshot.val() : 0;
    } catch (error) {
      throw new Error('Failed to get current customer number: ' + error.message);
    }
  }

  async getAllCustomersByUser(userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      const snapshot = await userCustomersRef.once('value');
      
      const customers = [];
      snapshot.forEach((childSnapshot) => {
        const customerData = childSnapshot.val();
        
        customers.push({
          id: childSnapshot.key,
          // Personal info
          name: customerData.name || '',
          phone: customerData.phone || '',
          address: customerData.address || '',
          
          // Document
          ktpNumber: customerData.ktpNumber || '',
          ktpPhoto: customerData.ktpPhoto || '',
          
          // Insurance info
          insuranceType: customerData.insuranceType || 'kendaraan', // kendaraan, kesehatan, jiwa, properti
          
          // Car data (only for kendaraan)
          carData: customerData.carData || {
            ownerName: '',
            plateNumber: '',
            chassisNumber: '',
            engineNumber: '',
            carBrand: '',
            carModel: '',
            carYear: '',
            carPrice: '',
            coverageType: 'TLO', // TLO atau ALL_RISK
            dueDate: null
          },
          
          // Car photos
          carPhotos: customerData.carPhotos || {
            stnk: '',
            leftSide: '',
            rightSide: '',
            front: '',
            back: '',
            dashboard: ''
          },
          
          createdBy: customerData.createdBy || userId,
          createdAt: customerData.createdAt || Date.now(),
          updatedAt: customerData.updatedAt || Date.now(),
        });
      });
      
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
        phone: customerData.phone || '',
        address: customerData.address || '',
        ktpNumber: customerData.ktpNumber || '',
        ktpPhoto: customerData.ktpPhoto || '',
        insuranceType: customerData.insuranceType || 'kendaraan',
        carData: customerData.carData || {
          ownerName: '',
          plateNumber: '',
          chassisNumber: '',
          engineNumber: '',
          carBrand: '',
          carModel: '',
          carYear: '',
          carPrice: '',
          coverageType: 'TLO',
          dueDate: null
        },
        carPhotos: customerData.carPhotos || {
          stnk: '',
          leftSide: '',
          rightSide: '',
          front: '',
          back: '',
          dashboard: ''
        },
        createdBy: customerData.createdBy || userId,
        createdAt: customerData.createdAt || Date.now(),
        updatedAt: customerData.updatedAt || Date.now(),
      };
    } catch (error) {
      throw new Error('Failed to fetch customer: ' + error.message);
    }
  }

  async createCustomer(customerData) {
    try {
      const { createdBy } = customerData;
      
      const nextNumber = await this.getNextCustomerNumber(createdBy);
      const customerId = `${createdBy}-${nextNumber}`;
      
      const { createdBy: _, ...customerDataWithoutCreatedBy } = customerData;
      
      const userCustomersRef = this.getUserCustomersRef(createdBy);
      
      const customerToSave = {
        name: customerDataWithoutCreatedBy.name || '',
        phone: customerDataWithoutCreatedBy.phone || '',
        address: customerDataWithoutCreatedBy.address || '',
        ktpNumber: customerDataWithoutCreatedBy.ktpNumber || '',
        ktpPhoto: customerDataWithoutCreatedBy.ktpPhoto || '',
        insuranceType: customerDataWithoutCreatedBy.insuranceType || 'kendaraan',
        carData: customerDataWithoutCreatedBy.carData || {
          ownerName: customerDataWithoutCreatedBy.name || '',
          plateNumber: '',
          chassisNumber: '',
          engineNumber: '',
          carBrand: '',
          carModel: '',
          carYear: '',
          carPrice: '',
          coverageType: 'TLO',
          dueDate: null
        },
        carPhotos: customerDataWithoutCreatedBy.carPhotos || {
          stnk: '',
          leftSide: '',
          rightSide: '',
          front: '',
          back: '',
          dashboard: ''
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

  async updateCustomer(customerId, updateData, userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      
      const snapshot = await userCustomersRef.child(customerId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Customer not found');
      }
      
      const existingCustomer = snapshot.val();
      
      let dataToUpdate = { ...updateData };
      
      if (updateData.carData) {
        dataToUpdate.carData = {
          ownerName: existingCustomer.carData?.ownerName || '',
          plateNumber: existingCustomer.carData?.plateNumber || '',
          chassisNumber: existingCustomer.carData?.chassisNumber || '',
          engineNumber: existingCustomer.carData?.engineNumber || '',
          carBrand: existingCustomer.carData?.carBrand || '',
          carModel: existingCustomer.carData?.carModel || '',
          carYear: existingCustomer.carData?.carYear || '',
          carPrice: existingCustomer.carData?.carPrice || '',
          coverageType: existingCustomer.carData?.coverageType || 'TLO',
          dueDate: existingCustomer.carData?.dueDate || null,
          ...updateData.carData
        };
      }
      
      if (updateData.carPhotos) {
        dataToUpdate.carPhotos = {
          stnk: existingCustomer.carPhotos?.stnk || '',
          leftSide: existingCustomer.carPhotos?.leftSide || '',
          rightSide: existingCustomer.carPhotos?.rightSide || '',
          front: existingCustomer.carPhotos?.front || '',
          back: existingCustomer.carPhotos?.back || '',
          dashboard: existingCustomer.carPhotos?.dashboard || '',
          ...updateData.carPhotos
        };
      }
      
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

  async deleteCustomer(customerId, userId) {
    try {
      const userCustomersRef = this.getUserCustomersRef(userId);
      
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