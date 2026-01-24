const { db } = require('../config/firebase');

class PropertyDAO {
  constructor() {
    this.propertiesRootRef = db.ref('property_data');
    this.propertyCountRef = db.ref('property_counters');
  }

  // Get reference untuk property collection user tertentu
  getUserPropertiesRef(userId) {
    return this.propertiesRootRef.child(userId);
  }

  // Get next property number untuk user
  async getNextPropertyNumber(userId) {
    try {
      const counterRef = this.propertyCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      let nextNumber = 1;
      if (snapshot.exists()) {
        nextNumber = snapshot.val() + 1;
      }
      
      // Update counter
      await counterRef.set(nextNumber);
      
      return nextNumber;
    } catch (error) {
      throw new Error('Failed to get next property number: ' + error.message);
    }
  }

  // Get current property number (tanpa increment)
  async getCurrentPropertyNumber(userId) {
    try {
      const counterRef = this.propertyCountRef.child(userId);
      const snapshot = await counterRef.once('value');
      
      return snapshot.exists() ? snapshot.val() : 0;
    } catch (error) {
      throw new Error('Failed to get current property number: ' + error.message);
    }
  }

  // Get all properties by user ID
  async getAllPropertiesByUser(userId) {
    try {
      const userPropertiesRef = this.getUserPropertiesRef(userId);
      const snapshot = await userPropertiesRef.once('value');
      
      const properties = [];
      snapshot.forEach((childSnapshot) => {
        const propertyData = childSnapshot.val();
        
        properties.push({
          id: childSnapshot.key,
          // Owner Info
          ownerName: propertyData.ownerName || '',
          ownerPhone: propertyData.ownerPhone || '',
          ownerEmail: propertyData.ownerEmail || '',
          ownerAddress: propertyData.ownerAddress || '',
          
          // Property Details
          propertyData: propertyData.propertyData || {
            propertyType: '', // House, Apartment, Office, Warehouse, etc
            address: '',
            city: '',
            province: '',
            postalCode: '',
            buildingArea: '', // m²
            landArea: '', // m²
            numberOfFloors: '',
            yearBuilt: '',
            propertyValue: '', // Nilai properti
            buildingStructure: '', // Concrete, Wood, Steel, etc
          },
          
          // Insurance Details
          insuranceData: propertyData.insuranceData || {
            policyNumber: '',
            insuranceCompany: '',
            coverageType: '', // Fire, Earthquake, Flood, All Risk, etc
            insuranceValue: '',
            premium: '',
            startDate: null,
            endDate: null,
            deductible: '',
          },
          
          // Property Photos
          propertyPhotos: propertyData.propertyPhotos || {
            front: '',
            back: '',
            left: '',
            right: '',
            interior1: '',
            interior2: '',
            interior3: '',
            interior4: '',
          },
          
          // Documents
          documents: propertyData.documents || {
            certificate: '', // Sertifikat tanah
            imb: '', // IMB
            pbb: '', // PBB
            other: '',
          },
          
          notes: propertyData.notes || '',
          status: propertyData.status || 'Active', // Active, Expired, Cancelled
          
          createdBy: propertyData.createdBy || userId,
          createdAt: propertyData.createdAt || Date.now(),
          updatedAt: propertyData.updatedAt || Date.now(),
        });
      });
      
      // Sort by property number
      properties.sort((a, b) => {
        const numA = parseInt(a.id.split('-')[1] || 0);
        const numB = parseInt(b.id.split('-')[1] || 0);
        return numA - numB;
      });
      
      return properties;
    } catch (error) {
      throw new Error('Failed to fetch properties by user: ' + error.message);
    }
  }

  // Get property by ID and user ID
  async getPropertyById(propertyId, userId) {
    try {
      const userPropertiesRef = this.getUserPropertiesRef(userId);
      const snapshot = await userPropertiesRef.child(propertyId).once('value');
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const propertyData = snapshot.val();
      
      return {
        id: propertyId,
        // Owner Info
        ownerName: propertyData.ownerName || '',
        ownerPhone: propertyData.ownerPhone || '',
        ownerEmail: propertyData.ownerEmail || '',
        ownerAddress: propertyData.ownerAddress || '',
        
        // Property Details
        propertyData: propertyData.propertyData || {
          propertyType: '',
          address: '',
          city: '',
          province: '',
          postalCode: '',
          buildingArea: '',
          landArea: '',
          numberOfFloors: '',
          yearBuilt: '',
          propertyValue: '',
          buildingStructure: '',
        },
        
        // Insurance Details
        insuranceData: propertyData.insuranceData || {
          policyNumber: '',
          insuranceCompany: '',
          coverageType: '',
          insuranceValue: '',
          premium: '',
          startDate: null,
          endDate: null,
          deductible: '',
        },
        
        // Property Photos
        propertyPhotos: propertyData.propertyPhotos || {
          front: '',
          back: '',
          left: '',
          right: '',
          interior1: '',
          interior2: '',
          interior3: '',
          interior4: '',
        },
        
        // Documents
        documents: propertyData.documents || {
          certificate: '',
          imb: '',
          pbb: '',
          other: '',
        },
        
        notes: propertyData.notes || '',
        status: propertyData.status || 'Active',
        
        createdBy: propertyData.createdBy || userId,
        createdAt: propertyData.createdAt || Date.now(),
        updatedAt: propertyData.updatedAt || Date.now(),
      };
    } catch (error) {
      throw new Error('Failed to fetch property: ' + error.message);
    }
  }

  // Create new property dengan ID format: {username}-{number}
  async createProperty(propertyData) {
    try {
      const { createdBy } = propertyData;
      
      // Get next property number untuk user ini
      const nextNumber = await this.getNextPropertyNumber(createdBy);
      
      // Generate property ID: {username}-{number}
      const propertyId = `${createdBy}-${nextNumber}`;
      
      // Hapus createdBy dari propertyData karena sudah di path
      const { createdBy: _, ...propertyDataWithoutCreatedBy } = propertyData;
      
      const userPropertiesRef = this.getUserPropertiesRef(createdBy);
      
      // Ensure all fields have values
      const propertyToSave = {
        // Owner Info
        ownerName: propertyDataWithoutCreatedBy.ownerName || '',
        ownerPhone: propertyDataWithoutCreatedBy.ownerPhone || '',
        ownerEmail: propertyDataWithoutCreatedBy.ownerEmail || '',
        ownerAddress: propertyDataWithoutCreatedBy.ownerAddress || '',
        
        // Property Details
        propertyData: propertyDataWithoutCreatedBy.propertyData || {
          propertyType: '',
          address: '',
          city: '',
          province: '',
          postalCode: '',
          buildingArea: '',
          landArea: '',
          numberOfFloors: '',
          yearBuilt: '',
          propertyValue: '',
          buildingStructure: '',
        },
        
        // Insurance Details
        insuranceData: propertyDataWithoutCreatedBy.insuranceData || {
          policyNumber: '',
          insuranceCompany: '',
          coverageType: '',
          insuranceValue: '',
          premium: '',
          startDate: null,
          endDate: null,
          deductible: '',
        },
        
        // Property Photos
        propertyPhotos: propertyDataWithoutCreatedBy.propertyPhotos || {
          front: '',
          back: '',
          left: '',
          right: '',
          interior1: '',
          interior2: '',
          interior3: '',
          interior4: '',
        },
        
        // Documents
        documents: propertyDataWithoutCreatedBy.documents || {
          certificate: '',
          imb: '',
          pbb: '',
          other: '',
        },
        
        notes: propertyDataWithoutCreatedBy.notes || '',
        status: propertyDataWithoutCreatedBy.status || 'Active',
        
        createdAt: propertyDataWithoutCreatedBy.createdAt || Date.now(),
        updatedAt: propertyDataWithoutCreatedBy.updatedAt || Date.now(),
      };
      
      // Simpan property di path: property_data/{userId}/{propertyId}
      await userPropertiesRef.child(propertyId).set(propertyToSave);
      
      return {
        id: propertyId,
        ...propertyToSave,
      };
    } catch (error) {
      throw new Error('Failed to create property: ' + error.message);
    }
  }

  // Update property
  async updateProperty(propertyId, updateData, userId) {
    try {
      const userPropertiesRef = this.getUserPropertiesRef(userId);
      
      // Cek apakah property ada
      const snapshot = await userPropertiesRef.child(propertyId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Property not found');
      }
      
      const existingProperty = snapshot.val();
      
      // Handle nested updates with defaults
      let dataToUpdate = { ...updateData };
      
      // If updating propertyData, merge with existing
      if (updateData.propertyData) {
        dataToUpdate.propertyData = {
          propertyType: existingProperty.propertyData?.propertyType || '',
          address: existingProperty.propertyData?.address || '',
          city: existingProperty.propertyData?.city || '',
          province: existingProperty.propertyData?.province || '',
          postalCode: existingProperty.propertyData?.postalCode || '',
          buildingArea: existingProperty.propertyData?.buildingArea || '',
          landArea: existingProperty.propertyData?.landArea || '',
          numberOfFloors: existingProperty.propertyData?.numberOfFloors || '',
          yearBuilt: existingProperty.propertyData?.yearBuilt || '',
          propertyValue: existingProperty.propertyData?.propertyValue || '',
          buildingStructure: existingProperty.propertyData?.buildingStructure || '',
          ...updateData.propertyData
        };
      }
      
      // If updating insuranceData, merge with existing
      if (updateData.insuranceData) {
        dataToUpdate.insuranceData = {
          policyNumber: existingProperty.insuranceData?.policyNumber || '',
          insuranceCompany: existingProperty.insuranceData?.insuranceCompany || '',
          coverageType: existingProperty.insuranceData?.coverageType || '',
          insuranceValue: existingProperty.insuranceData?.insuranceValue || '',
          premium: existingProperty.insuranceData?.premium || '',
          startDate: existingProperty.insuranceData?.startDate || null,
          endDate: existingProperty.insuranceData?.endDate || null,
          deductible: existingProperty.insuranceData?.deductible || '',
          ...updateData.insuranceData
        };
      }
      
      // If updating propertyPhotos, merge with existing
      if (updateData.propertyPhotos) {
        dataToUpdate.propertyPhotos = {
          front: existingProperty.propertyPhotos?.front || '',
          back: existingProperty.propertyPhotos?.back || '',
          left: existingProperty.propertyPhotos?.left || '',
          right: existingProperty.propertyPhotos?.right || '',
          interior1: existingProperty.propertyPhotos?.interior1 || '',
          interior2: existingProperty.propertyPhotos?.interior2 || '',
          interior3: existingProperty.propertyPhotos?.interior3 || '',
          interior4: existingProperty.propertyPhotos?.interior4 || '',
          ...updateData.propertyPhotos
        };
      }
      
      // If updating documents, merge with existing
      if (updateData.documents) {
        dataToUpdate.documents = {
          certificate: existingProperty.documents?.certificate || '',
          imb: existingProperty.documents?.imb || '',
          pbb: existingProperty.documents?.pbb || '',
          other: existingProperty.documents?.other || '',
          ...updateData.documents
        };
      }
      
      // Add updatedAt timestamp
      dataToUpdate.updatedAt = Date.now();
      
      await userPropertiesRef.child(propertyId).update(dataToUpdate);
      
      return {
        id: propertyId,
        ...existingProperty,
        ...dataToUpdate,
      };
    } catch (error) {
      throw new Error('Failed to update property: ' + error.message);
    }
  }

  // Delete property
  async deleteProperty(propertyId, userId) {
    try {
      const userPropertiesRef = this.getUserPropertiesRef(userId);
      
      // Cek apakah property ada
      const snapshot = await userPropertiesRef.child(propertyId).once('value');
      if (!snapshot.exists()) {
        throw new Error('Property not found');
      }
      
      await userPropertiesRef.child(propertyId).remove();
      
      return true;
    } catch (error) {
      throw new Error('Failed to delete property: ' + error.message);
    }
  }

  // Get property count for user
  async getPropertyCount(userId) {
    try {
      const userPropertiesRef = this.getUserPropertiesRef(userId);
      const snapshot = await userPropertiesRef.once('value');
      
      return snapshot.numChildren();
    } catch (error) {
      throw new Error('Failed to get property count: ' + error.message);
    }
  }

  // Get properties by status
  async getPropertiesByStatus(userId, status) {
    try {
      const allProperties = await this.getAllPropertiesByUser(userId);
      return allProperties.filter(property => property.status === status);
    } catch (error) {
      throw new Error('Failed to get properties by status: ' + error.message);
    }
  }

  // Check expired policies
  async checkExpiredPolicies(userId) {
    try {
      const allProperties = await this.getAllPropertiesByUser(userId);
      const now = Date.now();
      
      const expiredProperties = allProperties.filter(property => {
        const endDate = property.insuranceData?.endDate;
        return endDate && endDate < now && property.status === 'Active';
      });
      
      // Update status to Expired
      for (const property of expiredProperties) {
        await this.updateProperty(property.id, { status: 'Expired' }, userId);
      }
      
      return expiredProperties.length;
    } catch (error) {
      throw new Error('Failed to check expired policies: ' + error.message);
    }
  }
}

module.exports = new PropertyDAO();