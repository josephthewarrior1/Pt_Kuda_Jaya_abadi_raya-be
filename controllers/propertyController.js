const propertyDAO = require('../dao/propertyDAO');
const cloudinary = require('../config/cloudinary');

class PropertyController {
  // Get all properties (for current user)
  async getAllProperties(req, res) {
    try {
      const userId = req.user.username;
      
      console.log('🏠 Getting properties for user:', userId);
      
      const properties = await propertyDAO.getAllPropertiesByUser(userId);
      
      res.status(200).json({
        success: true,
        count: properties.length,
        properties,
      });
    } catch (error) {
      console.error('❌ Get all properties error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching properties',
      });
    }
  }

  // Get property by ID
  async getPropertyById(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;

      // Validasi format ID
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = id.split('-')[0];
      
      // Pastikan property ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this property',
        });
      }

      const property = await propertyDAO.getPropertyById(id, userId);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      res.status(200).json({
        success: true,
        property,
      });
    } catch (error) {
      console.error('❌ Get property error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching property',
      });
    }
  }

  // Create new property
  async createProperty(req, res) {
    try {
      const userId = req.user.username;
      const { 
        // Owner Info
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerAddress,
        
        // Property Details
        propertyType,
        address,
        city,
        province,
        postalCode,
        buildingArea,
        landArea,
        numberOfFloors,
        yearBuilt,
        propertyValue,
        buildingStructure,
        
        // Insurance Details
        policyNumber,
        insuranceCompany,
        coverageType,
        insuranceValue,
        premium,
        startDate,
        endDate,
        deductible,
        
        notes,
        status
      } = req.body;

      // Validation - Hanya ownerName yang required
      if (!ownerName || ownerName.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Owner name is required',
        });
      }

      // Get current property count
      const currentCount = await propertyDAO.getCurrentPropertyNumber(userId);
      const nextPropertyNumber = currentCount + 1;

      const propertyData = {
        // Owner Info
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone ? ownerPhone.trim() : '',
        ownerEmail: ownerEmail ? ownerEmail.trim() : '',
        ownerAddress: ownerAddress ? ownerAddress.trim() : '',
        
        // Property Details
        propertyData: {
          propertyType: propertyType ? propertyType.trim() : '',
          address: address ? address.trim() : '',
          city: city ? city.trim() : '',
          province: province ? province.trim() : '',
          postalCode: postalCode ? postalCode.trim() : '',
          buildingArea: buildingArea ? buildingArea.trim() : '',
          landArea: landArea ? landArea.trim() : '',
          numberOfFloors: numberOfFloors ? numberOfFloors.trim() : '',
          yearBuilt: yearBuilt ? yearBuilt.trim() : '',
          propertyValue: propertyValue ? propertyValue.trim() : '',
          buildingStructure: buildingStructure ? buildingStructure.trim() : '',
        },
        
        // Insurance Details
        insuranceData: {
          policyNumber: policyNumber ? policyNumber.trim() : '',
          insuranceCompany: insuranceCompany ? insuranceCompany.trim() : '',
          coverageType: coverageType ? coverageType.trim() : '',
          insuranceValue: insuranceValue ? insuranceValue.trim() : '',
          premium: premium ? premium.trim() : '',
          startDate: startDate || null,
          endDate: endDate || null,
          deductible: deductible ? deductible.trim() : '',
        },
        
        // Property Photos (will be uploaded separately)
        propertyPhotos: {
          front: '',
          back: '',
          left: '',
          right: '',
          interior1: '',
          interior2: '',
          interior3: '',
          interior4: '',
        },
        
        // Documents (will be uploaded separately)
        documents: {
          certificate: '',
          imb: '',
          pbb: '',
          other: '',
        },
        
        notes: notes ? notes.trim() : '',
        status: status || 'Active',
        
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newProperty = await propertyDAO.createProperty(propertyData);

      console.log('✅ New property created:', newProperty.id, 'by user:', userId);

      res.status(201).json({
        success: true,
        message: 'Property created successfully',
        property: newProperty,
        nextPropertyId: `${userId}-${nextPropertyNumber + 1}`,
      });
    } catch (error) {
      console.error('❌ Create property error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while creating property',
      });
    }
  }

  // Update property
  async updateProperty(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      
      // Validasi format ID
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = id.split('-')[0];
      
      // Pastikan property ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this property',
        });
      }

      const { 
        // Owner Info
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerAddress,
        
        // Property Details
        propertyType,
        address,
        city,
        province,
        postalCode,
        buildingArea,
        landArea,
        numberOfFloors,
        yearBuilt,
        propertyValue,
        buildingStructure,
        
        // Insurance Details
        policyNumber,
        insuranceCompany,
        coverageType,
        insuranceValue,
        premium,
        startDate,
        endDate,
        deductible,
        
        notes,
        status
      } = req.body;

      // Validation untuk update - jika ownerName dikirim, harus valid
      if (ownerName !== undefined && ownerName.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Owner name cannot be empty',
        });
      }

      const updateData = {
        // Owner Info
        ownerName: ownerName !== undefined ? ownerName.trim() : undefined,
        ownerPhone: ownerPhone !== undefined ? ownerPhone.trim() : undefined,
        ownerEmail: ownerEmail !== undefined ? ownerEmail.trim() : undefined,
        ownerAddress: ownerAddress !== undefined ? ownerAddress.trim() : undefined,
        
        // Property Details
        propertyData: {
          propertyType: propertyType !== undefined ? propertyType.trim() : undefined,
          address: address !== undefined ? address.trim() : undefined,
          city: city !== undefined ? city.trim() : undefined,
          province: province !== undefined ? province.trim() : undefined,
          postalCode: postalCode !== undefined ? postalCode.trim() : undefined,
          buildingArea: buildingArea !== undefined ? buildingArea.trim() : undefined,
          landArea: landArea !== undefined ? landArea.trim() : undefined,
          numberOfFloors: numberOfFloors !== undefined ? numberOfFloors.trim() : undefined,
          yearBuilt: yearBuilt !== undefined ? yearBuilt.trim() : undefined,
          propertyValue: propertyValue !== undefined ? propertyValue.trim() : undefined,
          buildingStructure: buildingStructure !== undefined ? buildingStructure.trim() : undefined,
        },
        
        // Insurance Details
        insuranceData: {
          policyNumber: policyNumber !== undefined ? policyNumber.trim() : undefined,
          insuranceCompany: insuranceCompany !== undefined ? insuranceCompany.trim() : undefined,
          coverageType: coverageType !== undefined ? coverageType.trim() : undefined,
          insuranceValue: insuranceValue !== undefined ? insuranceValue.trim() : undefined,
          premium: premium !== undefined ? premium.trim() : undefined,
          startDate: startDate !== undefined ? startDate : undefined,
          endDate: endDate !== undefined ? endDate : undefined,
          deductible: deductible !== undefined ? deductible.trim() : undefined,
        },
        
        notes: notes !== undefined ? notes.trim() : undefined,
        status: status !== undefined ? status : undefined,
        updatedAt: Date.now(),
      };

      // Hapus undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Hapus undefined fields dalam propertyData
      if (updateData.propertyData) {
        Object.keys(updateData.propertyData).forEach(key => {
          if (updateData.propertyData[key] === undefined) {
            delete updateData.propertyData[key];
          }
        });
        
        if (Object.keys(updateData.propertyData).length === 0) {
          delete updateData.propertyData;
        }
      }

      // Hapus undefined fields dalam insuranceData
      if (updateData.insuranceData) {
        Object.keys(updateData.insuranceData).forEach(key => {
          if (updateData.insuranceData[key] === undefined) {
            delete updateData.insuranceData[key];
          }
        });
        
        if (Object.keys(updateData.insuranceData).length === 0) {
          delete updateData.insuranceData;
        }
      }

      const updatedProperty = await propertyDAO.updateProperty(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        property: updatedProperty,
      });
    } catch (error) {
      console.error('❌ Update property error:', error);
      if (error.message === 'Property not found') {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }
      res.status(500).json({
        success: false,
        error: 'Server error while updating property',
      });
    }
  }

  // Upload property photos
  async uploadPropertyPhotos(req, res) {
    try {
      const userId = req.user.username;
      const { id: propertyId } = req.params;
      
      // Validasi format ID
      if (!propertyId.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = propertyId.split('-')[0];
      
      // Pastikan property ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this property',
        });
      }
      
      console.log('📸 Uploading property photos for:', propertyId);

      // Check if property exists
      const property = await propertyDAO.getPropertyById(propertyId, userId);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      const files = req.files;
      const uploadedPhotos = {};

      // Upload each photo to Cloudinary
      const uploadPromises = [];
      const photoTypes = ['front', 'back', 'left', 'right', 'interior1', 'interior2', 'interior3', 'interior4'];

      photoTypes.forEach(photoType => {
        if (files[photoType] && files[photoType][0]) {
          uploadPromises.push(
            new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: `property_insurance/properties/${propertyId}`,
                  public_id: `${propertyId}_${photoType}`,
                  resource_type: 'image'
                },
                (error, result) => {
                  if (error) {
                    reject(error);
                  } else {
                    uploadedPhotos[photoType] = result.secure_url;
                    resolve();
                  }
                }
              );
              
              stream.end(files[photoType][0].buffer);
            })
          );
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Update property with photo URLs
      const updatedProperty = await propertyDAO.updateProperty(
        propertyId, 
        { 
          propertyPhotos: uploadedPhotos,
          updatedAt: Date.now()
        }, 
        userId
      );

      console.log('✅ Property photos uploaded for:', propertyId);

      res.status(200).json({
        success: true,
        message: 'Property photos uploaded successfully',
        photos: uploadedPhotos,
        property: updatedProperty,
      });
    } catch (error) {
      console.error('❌ Upload property photos error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while uploading property photos',
      });
    }
  }

  // Upload property documents
  async uploadPropertyDocuments(req, res) {
    try {
      const userId = req.user.username;
      const { id: propertyId } = req.params;
      
      // Validasi format ID
      if (!propertyId.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = propertyId.split('-')[0];
      
      // Pastikan property ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this property',
        });
      }
      
      console.log('📄 Uploading property documents for:', propertyId);

      // Check if property exists
      const property = await propertyDAO.getPropertyById(propertyId, userId);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }

      const files = req.files;
      const uploadedDocuments = {};

      // Upload each document to Cloudinary
      const uploadPromises = [];
      const docTypes = ['certificate', 'imb', 'pbb', 'other'];
      docTypes.forEach(docType => {
        if (files[docType] && files[docType][0]) {
          uploadPromises.push(
            new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: `property_insurance/documents/${propertyId}`,
                  public_id: `${propertyId}_${docType}`,
                  resource_type: 'auto' // Support PDF, images, etc
                },
                (error, result) => {
                  if (error) {
                    reject(error);
                  } else {
                    uploadedDocuments[docType] = result.secure_url;
                    resolve();
                  }
                }
              );
              
              stream.end(files[docType][0].buffer);
            })
          );
        }
      });
    
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
    
      // Update property with document URLs
      const updatedProperty = await propertyDAO.updateProperty(
        propertyId, 
        { 
          documents: uploadedDocuments,
          updatedAt: Date.now()
        }, 
        userId
      );
    
      console.log('✅ Property documents uploaded for:', propertyId);
    
      res.status(200).json({
        success: true,
        message: 'Property documents uploaded successfully',
        documents: uploadedDocuments,
        property: updatedProperty,
      });
    } catch (error) {
      console.error('❌ Upload property documents error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while uploading property documents',
      });
    }
    }
    // Delete property
    async deleteProperty(req, res) {
    try {
    const userId = req.user.username;
    const { id } = req.params;
      // Validasi format ID
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid property ID format. Expected: {username}-{number}',
        });
      }
    
      // Extract username dari ID untuk verifikasi
      const idUsername = id.split('-')[0];
      
      // Pastikan property ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this property',
        });
      }
    
      await propertyDAO.deleteProperty(id, userId);
    
      console.log('✅ Property deleted:', id, 'by user:', userId);
    
      res.status(200).json({
        success: true,
        message: 'Property deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete property error:', error);
      if (error.message === 'Property not found') {
        return res.status(404).json({
          success: false,
          error: 'Property not found',
        });
      }
      res.status(500).json({
        success: false,
        error: 'Server error while deleting property',
      });
    }
    }
    // Get property statistics
    async getPropertyStats(req, res) {
    try {
    const userId = req.user.username;
      const count = await propertyDAO.getPropertyCount(userId);
      const currentNumber = await propertyDAO.getCurrentPropertyNumber(userId);
      const activeProperties = await propertyDAO.getPropertiesByStatus(userId, 'Active');
      const expiredProperties = await propertyDAO.getPropertiesByStatus(userId, 'Expired');
      
      res.status(200).json({
        success: true,
        stats: {
          totalProperties: count,
          activeProperties: activeProperties.length,
          expiredProperties: expiredProperties.length,
          currentCounter: currentNumber,
          nextPropertyId: `${userId}-${currentNumber + 1}`
        }
      });
    } catch (error) {
      console.error('❌ Get property stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching stats',
      });
    }
    }
    // Search properties
    async searchProperties(req, res) {
    try {
    const userId = req.user.username;
    const { query } = req.query;
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }
    
      const searchTerm = query.toLowerCase().trim();
      const allProperties = await propertyDAO.getAllPropertiesByUser(userId);
    
      const filteredProperties = allProperties.filter(property => {
        return (
          (property.ownerName && property.ownerName.toLowerCase().includes(searchTerm)) ||
          (property.ownerPhone && property.ownerPhone.includes(searchTerm)) ||
          (property.ownerEmail && property.ownerEmail.toLowerCase().includes(searchTerm)) ||
          (property.propertyData?.address && property.propertyData.address.toLowerCase().includes(searchTerm)) ||
          (property.propertyData?.city && property.propertyData.city.toLowerCase().includes(searchTerm)) ||
          (property.propertyData?.propertyType && property.propertyData.propertyType.toLowerCase().includes(searchTerm)) ||
          (property.insuranceData?.policyNumber && property.insuranceData.policyNumber.toLowerCase().includes(searchTerm)) ||
          (property.insuranceData?.insuranceCompany && property.insuranceData.insuranceCompany.toLowerCase().includes(searchTerm))
        );
      });
    
      res.status(200).json({
        success: true,
        count: filteredProperties.length,
        properties: filteredProperties,
      });
    } catch (error) {
      console.error('❌ Search properties error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while searching properties',
      });
    }
    }
    // Check and update expired policies
    async checkExpiredPolicies(req, res) {
    try {
    const userId = req.user.username;
      const expiredCount = await propertyDAO.checkExpiredPolicies(userId);
      
      res.status(200).json({
        success: true,
        message: `${expiredCount} policies updated to expired status`,
        expiredCount
      });
    } catch (error) {
      console.error('❌ Check expired policies error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while checking expired policies',
      });
    }
    }
    // Get properties by status
    async getPropertiesByStatus(req, res) {
    try {
    const userId = req.user.username;
    const { status } = req.params;
      if (!['Active', 'Expired', 'Cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Use: Active, Expired, or Cancelled',
        });
      }
    
      const properties = await propertyDAO.getPropertiesByStatus(userId, status);
    
      res.status(200).json({
        success: true,
        count: properties.length,
        properties,
      });
    } catch (error) {
      console.error('❌ Get properties by status error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching properties',
      });
    }
    }
    }
    module.exports = new PropertyController();