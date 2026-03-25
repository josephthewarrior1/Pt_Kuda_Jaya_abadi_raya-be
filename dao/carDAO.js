const { db } = require('../config/firebase');

class CarDAO {
  constructor() {
    this.carsRootRef = db.ref('car_data');
    this.carCountRef = db.ref('car_counters');
  }

  // Get reference for user's car collection
  getUserCarsRef(userId) {
    return this.carsRootRef.child(userId);
  }

  // Get next car number for user
  async getNextCarNumber(userId) {
    try {
      const counterRef = this.carCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }
      
      // Update counter
      await counterRef.set(nextNumber);
      
      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next car number: ' + error.message);
    }
  }

  // Get current car number (without incrementing)
  async getCurrentCarNumber(userId) {
    try {
      const counterRef = this.carCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      return snapshot.exists() ? snapshot.val() : 0;
    } catch (error) {
      throw new Error('Failed to get current car number: ' + error.message);
    }
  }

  // Get all cars by user ID
  async getAllCarsByUser(userId) {
    try {
      const userCarsRef = this.getUserCarsRef(userId);
      const snapshot = await userCarsRef.once('value');
      
      const cars = [];
      snapshot.forEach((childSnapshot) => {
        const carData = childSnapshot.val();
        
        cars.push({
          id: childSnapshot.key,
          customerId: carData.customerId || '',
          carData: carData.carData || {
            ownerName: '',
            carBrand: '',
            carModel: '',
            plateNumber: '',
            chassisNumber: '',
            engineNumber: '',
            dueDate: null,
            carPrice: 0,
            color: '',
            year: '',
          },
          documentStatus: carData.documentStatus || {
            hasSTNK: false,
            hasSIM: false,
            hasKTP: false
          },
          carPhotos: carData.carPhotos || {
            leftSide: '',
            rightSide: '',
            front: '',
            back: ''
          },
          documentPhotos: carData.documentPhotos || {
            stnk: '',
            sim: '',
            ktp: ''
          },
          status: carData.status || 'Active',
          notes: carData.notes || '',
          createdBy: carData.createdBy || userId,
          createdAt: carData.createdAt || Date.now(),
          updatedAt: carData.updatedAt || Date.now(),
        });
      });
      
      // Sort by car number
      cars.sort((a, b) => {
        const numA = parseInt(a.id.split('-')[1] || 0);
        const numB = parseInt(b.id.split('-')[1] || 0);
        return numA - numB;
      });
      
      return cars;
    } catch (error) {
      throw new Error('Failed to fetch cars by user: ' + error.message);
    }
  }

  // Get cars by customer ID
  async getCarsByCustomerId(customerId, userId) {
    try {
      const allCars = await this.getAllCarsByUser(userId);
      return allCars.filter(car => car.customerId === customerId);
    } catch (error) {
      throw new Error('Failed to fetch cars by customer: ' + error.message);
    }
  }

  // Get car by ID and user ID
  async getCarById(carId, userId) {
    try {
      const userCarsRef = this.getUserCarsRef(userId);
      const snapshot = await userCarsRef.child(carId).once('value');
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const carData = snapshot.val();
      
      return {
        id: carId,
        customerId: carData.customerId || '',
        carData: carData.carData || {
          ownerName: '',
          carBrand: '',
          carModel: '',
          plateNumber: '',
          chassisNumber: '',
          engineNumber: '',
          dueDate: null,
          carPrice: 0,
          color: '',
          year: '',
        },
        documentStatus: carData.documentStatus || {
          hasSTNK: false,
          hasSIM: false,
          hasKTP: false
        },
        carPhotos: carData.carPhotos || {
          leftSide: '',
          rightSide: '',
          front: '',
          back: ''
        },
        documentPhotos: carData.documentPhotos || {
          stnk: '',
          sim: '',
          ktp: ''
        },
        status: carData.status || 'Active',
        notes: carData.notes || '',
        createdBy: carData.createdBy || userId,
        createdAt: carData.createdAt || Date.now(),
        updatedAt: carData.updatedAt || Date.now(),
      };
    } catch (error) {
      throw new Error('Failed to fetch car: ' + error.message);
    }
  }

  // Create new car with ID format: {username}-{number}
  async createCar(carInputData) {
    try {
      const { createdBy, customerId } = carInputData;
      
      if (!customerId) {
        throw new Error('Customer ID is required to create a car');
      }

      // Get next car number for this user
      const nextNumber = await this.getNextCarNumber(createdBy);
      
      // Generate car ID: {username}-{number} (Note: for uniqueness, this counter is independent of customers)
      const carId = `${createdBy}-car-${nextNumber}`;
      
      // Remove createdBy so we don't duplicate it in saved data
      const { createdBy: _, ...carDataWithoutCreatedBy } = carInputData;
      
      const userCarsRef = this.getUserCarsRef(createdBy);
      
      const carToSave = {
        customerId: carDataWithoutCreatedBy.customerId,
        carData: carDataWithoutCreatedBy.carData || {
          ownerName: '',
          carBrand: '',
          carModel: '',
          plateNumber: '',
          chassisNumber: '',
          engineNumber: '',
          dueDate: null,
          carPrice: 0,
          color: '',
          year: '',
        },
        documentStatus: carDataWithoutCreatedBy.documentStatus || {
          hasSTNK: false,
          hasSIM: false,
          hasKTP: false
        },
        carPhotos: carDataWithoutCreatedBy.carPhotos || {
          leftSide: '',
          rightSide: '',
          front: '',
          back: ''
        },
        documentPhotos: carDataWithoutCreatedBy.documentPhotos || {
          stnk: '',
          sim: '',
          ktp: ''
        },
        status: carDataWithoutCreatedBy.status || 'Active',
        notes: carDataWithoutCreatedBy.notes || '',
        createdAt: carDataWithoutCreatedBy.createdAt || Date.now(),
        updatedAt: carDataWithoutCreatedBy.updatedAt || Date.now(),
      };
      
      await userCarsRef.child(carId).set(carToSave);
      
      return {
        id: carId,
        ...carToSave,
      };
    } catch (error) {
      throw new Error('Failed to create car: ' + error.message);
    }
  }

  // Update car
  async updateCar(carId, updateData, userId) {
    try {
      const userCarsRef = this.getUserCarsRef(userId);
      
      // Check if car exists
      const snapshot = await userCarsRef.child(carId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Car not found');
      }
      
      const existingCar = snapshot.val();
      const updates = {};
      
      if (updateData.customerId !== undefined) updates['customerId'] = updateData.customerId;
      if (updateData.status !== undefined) updates['status'] = updateData.status;
      if (updateData.notes !== undefined) updates['notes'] = updateData.notes;

      // carData dot notation updates
      if (updateData.carData) {
        const cd = updateData.carData;
        if (cd.ownerName !== undefined) updates['carData/ownerName'] = cd.ownerName;
        if (cd.carBrand !== undefined) updates['carData/carBrand'] = cd.carBrand;
        if (cd.carModel !== undefined) updates['carData/carModel'] = cd.carModel;
        if (cd.plateNumber !== undefined) updates['carData/plateNumber'] = cd.plateNumber;
        if (cd.chassisNumber !== undefined) updates['carData/chassisNumber'] = cd.chassisNumber;
        if (cd.engineNumber !== undefined) updates['carData/engineNumber'] = cd.engineNumber;
        if (cd.dueDate !== undefined) updates['carData/dueDate'] = cd.dueDate;
        if (cd.carPrice !== undefined) updates['carData/carPrice'] = cd.carPrice;
        if (cd.color !== undefined) updates['carData/color'] = cd.color;
        if (cd.year !== undefined) updates['carData/year'] = cd.year;
      }

      // documentStatus
      if (updateData.documentStatus) {
        const ds = updateData.documentStatus;
        if (ds.hasSTNK !== undefined) updates['documentStatus/hasSTNK'] = ds.hasSTNK;
        if (ds.hasSIM !== undefined) updates['documentStatus/hasSIM'] = ds.hasSIM;
        if (ds.hasKTP !== undefined) updates['documentStatus/hasKTP'] = ds.hasKTP;
      }

      // carPhotos
      if (updateData.carPhotos) {
        const cp = updateData.carPhotos;
        if (cp.leftSide !== undefined) updates['carPhotos/leftSide'] = cp.leftSide;
        if (cp.rightSide !== undefined) updates['carPhotos/rightSide'] = cp.rightSide;
        if (cp.front !== undefined) updates['carPhotos/front'] = cp.front;
        if (cp.back !== undefined) updates['carPhotos/back'] = cp.back;
      }

      // documentPhotos
      if (updateData.documentPhotos) {
        const dp = updateData.documentPhotos;
        if (dp.stnk !== undefined) updates['documentPhotos/stnk'] = dp.stnk;
        if (dp.sim !== undefined) updates['documentPhotos/sim'] = dp.sim;
        if (dp.ktp !== undefined) updates['documentPhotos/ktp'] = dp.ktp;
      }

      updates['updatedAt'] = Date.now();

      await userCarsRef.child(carId).update(updates);
      
      return {
        id: carId,
        ...existingCar,
        ...updateData,
        updatedAt: updates['updatedAt'],
      };
    } catch (error) {
      throw new Error('Failed to update car: ' + error.message);
    }
  }

  // Delete car
  async deleteCar(carId, userId) {
    try {
      const userCarsRef = this.getUserCarsRef(userId);
      
      const snapshot = await userCarsRef.child(carId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Car not found');
      }
      
      await userCarsRef.child(carId).remove();
      
      return true;
    } catch (error) {
      throw new Error('Failed to delete car: ' + error.message);
    }
  }

  // Get car count for user
  async getCarCount(userId) {
    try {
      const userCarsRef = this.getUserCarsRef(userId);
      const snapshot = await userCarsRef.once('value');
      
      return snapshot.numChildren();
    } catch (error) {
      throw new Error('Failed to get car count: ' + error.message);
    }
  }
}

module.exports = new CarDAO();