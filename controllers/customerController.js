const customerDAO = require('../dao/customerDAO');
const cloudinary = require('../config/cloudinary');

class CustomerController {
  // Get all customers (for current user)
  async getAllCustomers(req, res) {
    try {
      const userId = req.user.username;
      
      console.log('📋 Getting customers for user:', userId);
      
      const customers = await customerDAO.getAllCustomersByUser(userId);
      
      res.status(200).json({
        success: true,
        count: customers.length,
        customers,
      });
    } catch (error) {
      console.error('❌ Get all customers error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching customers',
      });
    }
  }

  // Get customer by ID
  async getCustomerById(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;

      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      const idUsername = id.split('-')[0];
      
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this customer',
        });
      }

      const customer = await customerDAO.getCustomerById(id, userId);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      res.status(200).json({
        success: true,
        customer,
      });
    } catch (error) {
      console.error('❌ Get customer error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching customer',
      });
    }
  }

  // Create new customer with simplified data
  async createCustomer(req, res) {
    try {
      const userId = req.user.username;
      const { 
        // Personal info
        name, 
        phone, 
        address,
        
        // Document
        ktpNumber,
        
        // Insurance type
        insuranceType, // kendaraan, kesehatan, jiwa, properti
        
        // Car data (only for kendaraan insurance)
        carOwnerName,
        plateNumber,
        chassisNumber,
        engineNumber,
        carBrand,
        carModel,
        carYear,
        carPrice,
        coverageType, // TLO atau ALL_RISK
        dueDate
      } = req.body;

      // Validation - hanya name yang required
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Customer name is required',
        });
      }

      // Validation - insurance type harus valid
      const validInsuranceTypes = ['kendaraan', 'kesehatan', 'jiwa', 'properti'];
      const selectedInsuranceType = insuranceType || 'kendaraan';
      
      if (!validInsuranceTypes.includes(selectedInsuranceType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid insurance type. Must be: kendaraan, kesehatan, jiwa, or properti',
        });
      }

      // Validation - coverage type harus valid (untuk asuransi kendaraan)
      const validCoverageTypes = ['TLO', 'ALL_RISK'];
      const selectedCoverageType = coverageType || 'TLO';
      
      if (selectedInsuranceType === 'kendaraan' && !validCoverageTypes.includes(selectedCoverageType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coverage type. Must be: TLO or ALL_RISK',
        });
      }

      const currentCount = await customerDAO.getCurrentCustomerNumber(userId);
      const nextCustomerNumber = currentCount + 1;

      const customerData = {
        // Personal info
        name: name.trim(),
        phone: phone ? phone.trim() : '',
        address: address ? address.trim() : '',
        
        // Document
        ktpNumber: ktpNumber ? ktpNumber.trim() : '',
        ktpPhoto: '', // Will be uploaded separately
        
        // Insurance type
        insuranceType: selectedInsuranceType,
        
        // Car data (hanya untuk asuransi kendaraan)
        carData: selectedInsuranceType === 'kendaraan' ? {
          ownerName: carOwnerName ? carOwnerName.trim() : name.trim(),
          plateNumber: plateNumber ? plateNumber.trim() : '',
          chassisNumber: chassisNumber ? chassisNumber.trim() : '',
          engineNumber: engineNumber ? engineNumber.trim() : '',
          carBrand: carBrand ? carBrand.trim() : '',
          carModel: carModel ? carModel.trim() : '',
          carYear: carYear ? carYear.trim() : '',
          carPrice: carPrice ? carPrice.trim() : '',
          coverageType: selectedCoverageType,
          dueDate: dueDate || null,
        } : {
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
        
        // Car photos
        carPhotos: {
          stnk: '',
          leftSide: '',
          rightSide: '',
          front: '',
          back: '',
          dashboard: ''
        },
        
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newCustomer = await customerDAO.createCustomer(customerData);

      console.log('✅ New customer created:', newCustomer.id, 'by user:', userId);

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        customer: newCustomer,
        nextCustomerId: `${userId}-${nextCustomerNumber + 1}`,
      });
    } catch (error) {
      console.error('❌ Create customer error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while creating customer',
      });
    }
  }

  // Update customer
  async updateCustomer(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      const idUsername = id.split('-')[0];
      
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this customer',
        });
      }

      const { 
        name, phone, address,
        ktpNumber,
        insuranceType,
        // Car data
        carOwnerName,
        plateNumber,
        chassisNumber,
        engineNumber,
        carBrand,
        carModel,
        carYear,
        carPrice,
        coverageType,
        dueDate
      } = req.body;

      if (name !== undefined && name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Customer name cannot be empty',
        });
      }

      // Validation - insurance type harus valid jika dikirim
      if (insuranceType !== undefined) {
        const validInsuranceTypes = ['kendaraan', 'kesehatan', 'jiwa', 'properti'];
        if (!validInsuranceTypes.includes(insuranceType)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid insurance type. Must be: kendaraan, kesehatan, jiwa, or properti',
          });
        }
      }

      // Validation - coverage type harus valid jika dikirim
      if (coverageType !== undefined) {
        const validCoverageTypes = ['TLO', 'ALL_RISK'];
        if (!validCoverageTypes.includes(coverageType)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid coverage type. Must be: TLO or ALL_RISK',
          });
        }
      }

      const updateData = {
        name: name !== undefined ? name.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        ktpNumber: ktpNumber !== undefined ? ktpNumber.trim() : undefined,
        insuranceType: insuranceType !== undefined ? insuranceType : undefined,
        
        carData: {
          ownerName: carOwnerName !== undefined ? carOwnerName.trim() : undefined,
          plateNumber: plateNumber !== undefined ? plateNumber.trim() : undefined,
          chassisNumber: chassisNumber !== undefined ? chassisNumber.trim() : undefined,
          engineNumber: engineNumber !== undefined ? engineNumber.trim() : undefined,
          carBrand: carBrand !== undefined ? carBrand.trim() : undefined,
          carModel: carModel !== undefined ? carModel.trim() : undefined,
          carYear: carYear !== undefined ? carYear.trim() : undefined,
          carPrice: carPrice !== undefined ? carPrice.trim() : undefined,
          coverageType: coverageType !== undefined ? coverageType : undefined,
          dueDate: dueDate !== undefined ? dueDate : undefined,
        },
        
        updatedAt: Date.now(),
      };

      // Hapus undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      if (updateData.carData) {
        Object.keys(updateData.carData).forEach(key => {
          if (updateData.carData[key] === undefined) {
            delete updateData.carData[key];
          }
        });
        
        if (Object.keys(updateData.carData).length === 0) {
          delete updateData.carData;
        }
      }

      const updatedCustomer = await customerDAO.updateCustomer(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        customer: updatedCustomer,
      });
    } catch (error) {
      console.error('❌ Update customer error:', error);
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }
      res.status(500).json({
        success: false,
        error: 'Server error while updating customer',
      });
    }
  }

  // Upload car photos
  async uploadCarPhotos(req, res) {
    try {
      const userId = req.user.username;
      const { id: customerId } = req.params;
      
      if (!customerId.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      const idUsername = customerId.split('-')[0];
      
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this customer',
        });
      }
      
      console.log('📸 Uploading car photos for customer:', customerId);

      const customer = await customerDAO.getCustomerById(customerId, userId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      const files = req.files;
      const uploadedPhotos = {};

      const uploadPromises = [];

      // STNK Photo
      if (files.stnk && files.stnk[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}`,
                public_id: `${customerId}_stnk`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedPhotos.stnk = result.secure_url;
                  resolve();
                }
              }
            );
            stream.end(files.stnk[0].buffer);
          })
        );
      }

      // Left Side Photo
      if (files.leftSide && files.leftSide[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}`,
                public_id: `${customerId}_left`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedPhotos.leftSide = result.secure_url;
                  resolve();
                }
              }
            );
            stream.end(files.leftSide[0].buffer);
          })
        );
      }

      // Right Side Photo
      if (files.rightSide && files.rightSide[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}`,
                public_id: `${customerId}_right`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedPhotos.rightSide = result.secure_url;
                  resolve();
                }
              }
            );
            stream.end(files.rightSide[0].buffer);
          })
        );
      }

      // Front Photo
      if (files.front && files.front[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}`,
                public_id: `${customerId}_front`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedPhotos.front = result.secure_url;
                  resolve();
                }
              }
            );
            stream.end(files.front[0].buffer);
          })
        );
      }

      // Back Photo
      if (files.back && files.back[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}`,
                public_id: `${customerId}_back`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedPhotos.back = result.secure_url;
                  resolve();
                }
              }
            );
            stream.end(files.back[0].buffer);
          })
        );
      }

      // Dashboard Photo
      if (files.dashboard && files.dashboard[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}`,
                public_id: `${customerId}_dashboard`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedPhotos.dashboard = result.secure_url;
                  resolve();
                }
              }
            );
            stream.end(files.dashboard[0].buffer);
          })
        );
      }

      await Promise.all(uploadPromises);

      const updatedCustomer = await customerDAO.updateCustomer(
        customerId, 
        { 
          carPhotos: uploadedPhotos,
          updatedAt: Date.now()
        }, 
        userId
      );

      console.log('✅ Car photos uploaded for customer:', customerId);

      res.status(200).json({
        success: true,
        message: 'Car photos uploaded successfully',
        photos: uploadedPhotos,
        customer: updatedCustomer,
      });
    } catch (error) {
      console.error('❌ Upload car photos error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while uploading car photos',
      });
    }
  }

  // Delete customer
  async deleteCustomer(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;

      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      const idUsername = id.split('-')[0];
      
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this customer',
        });
      }

      await customerDAO.deleteCustomer(id, userId);

      console.log('✅ Customer deleted:', id, 'by user:', userId);

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete customer error:', error);
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }
      res.status(500).json({
        success: false,
        error: 'Server error while deleting customer',
      });
    }
  }

  // Get customer statistics
  async getCustomerStats(req, res) {
    try {
      const userId = req.user.username;
      
      const count = await customerDAO.getCustomerCount(userId);
      const currentNumber = await customerDAO.getCurrentCustomerNumber(userId);
      
      res.status(200).json({
        success: true,
        stats: {
          totalCustomers: count,
          currentCounter: currentNumber,
          nextCustomerId: `${userId}-${currentNumber + 1}`
        }
      });
    } catch (error) {
      console.error('❌ Get customer stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching stats',
      });
    }
  }

  // Search customers
  async searchCustomers(req, res) {
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
      const allCustomers = await customerDAO.getAllCustomersByUser(userId);

      const filteredCustomers = allCustomers.filter(customer => {
        return (
          (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
          (customer.phone && customer.phone.includes(searchTerm)) ||
          (customer.ktpNumber && customer.ktpNumber.includes(searchTerm)) ||
          (customer.carData?.plateNumber && customer.carData.plateNumber.toLowerCase().includes(searchTerm)) ||
          (customer.carData?.carBrand && customer.carData.carBrand.toLowerCase().includes(searchTerm)) ||
          (customer.carData?.carModel && customer.carData.carModel.toLowerCase().includes(searchTerm))
        );
      });

      res.status(200).json({
        success: true,
        count: filteredCustomers.length,
        customers: filteredCustomers,
      });
    } catch (error) {
      console.error('❌ Search customers error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while searching customers',
      });
    }
  }
}

module.exports = new CustomerController();