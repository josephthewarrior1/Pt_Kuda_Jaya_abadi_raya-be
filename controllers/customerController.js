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

      // Validasi format ID
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = id.split('-')[0];
      
      // Pastikan customer ID milik user yang sedang login
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

  // Create new customer with car data
  async createCustomer(req, res) {
    try {
      const userId = req.user.username;
      const { 
        name, 
        email, 
        phone, 
        address, 
        notes,
        // Car data
        carOwnerName,
        carBrand,
        carModel,
        plateNumber,
        chassisNumber,
        engineNumber,
        dueDate,
        carPrice,
        // Document data (opsional)
        hasSTNK,
        hasSIM,
        hasKTP
      } = req.body;

      // Validation - Hanya name yang required
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Customer name is required',
        });
      }

      // Get current customer count untuk tahu nomor berikutnya
      const currentCount = await customerDAO.getCurrentCustomerNumber(userId);
      const nextCustomerNumber = currentCount + 1;

      const customerData = {
        // Personal data
        name: name.trim(),
        email: email ? email.trim() : '',
        phone: phone ? phone.trim() : '',
        address: address ? address.trim() : '',
        notes: notes ? notes.trim() : '',
        
        // Status - default null (akan dihitung dari dueDate di frontend)
        status: null,
        
        // Car data
        carData: {
          ownerName: carOwnerName ? carOwnerName.trim() : name.trim(),
          carBrand: carBrand ? carBrand.trim() : '',
          carModel: carModel ? carModel.trim() : '',
          plateNumber: plateNumber ? plateNumber.trim() : '',
          chassisNumber: chassisNumber ? chassisNumber.trim() : '',
          engineNumber: engineNumber ? engineNumber.trim() : '',
          dueDate: dueDate || null,
          carPrice: carPrice ? parseFloat(carPrice) : 0,
        },
        
        // Document status (opsional)
        documentStatus: {
          hasSTNK: hasSTNK === 'true' || hasSTNK === true,
          hasSIM: hasSIM === 'true' || hasSIM === true,
          hasKTP: hasKTP === 'true' || hasKTP === true,
        },
        
        // Car photos (will be uploaded separately)
        carPhotos: {
          leftSide: '',
          rightSide: '',
          front: '',
          back: ''
        },
        
        // Document photos (opsional, akan diupload terpisah)
        documentPhotos: {
          stnk: '',
          sim: '',
          ktp: ''
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

  // Update customer with car data
  async updateCustomer(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;
      
      // Validasi format ID
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = id.split('-')[0];
      
      // Pastikan customer ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this customer',
        });
      }

      const { 
        name, email, phone, address, notes,
        // ✅ TAMBAHAN: status field
        status,
        // Car data
        carOwnerName,
        carBrand,
        carModel,
        plateNumber,
        chassisNumber,
        engineNumber,
        dueDate,
        carPrice,
        // Document status (opsional)
        hasSTNK,
        hasSIM,
        hasKTP
      } = req.body;

      // Validation untuk update - jika name dikirim, harus valid
      if (name !== undefined && name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Customer name cannot be empty',
        });
      }

      // ✅ Validasi status yang diperbolehkan
      const allowedStatuses = ['Cancelled', null, undefined];
      if (status !== undefined && !allowedStatuses.includes(status) && status !== 'null') {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value. Allowed: Cancelled or null (to reset)',
        });
      }

      const updateData = {
        // Personal data
        name: name !== undefined ? name.trim() : undefined,
        email: email !== undefined ? email.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        notes: notes !== undefined ? notes.trim() : undefined,
        
        // ✅ TAMBAHAN: status - bisa di-set ke 'Cancelled' atau null (reset ke date-based)
        // Kita handle 'null' string juga karena JSON kadang kirim string
        status: status !== undefined ? (status === 'null' ? null : status) : undefined,
        
        // Car data
        carData: {
          ownerName: carOwnerName !== undefined ? carOwnerName.trim() : undefined,
          carBrand: carBrand !== undefined ? carBrand.trim() : undefined,
          carModel: carModel !== undefined ? carModel.trim() : undefined,
          plateNumber: plateNumber !== undefined ? plateNumber.trim() : undefined,
          chassisNumber: chassisNumber !== undefined ? chassisNumber.trim() : undefined,
          engineNumber: engineNumber !== undefined ? engineNumber.trim() : undefined,
          dueDate: dueDate !== undefined ? dueDate : undefined,
          carPrice: carPrice !== undefined ? parseFloat(carPrice) : undefined,
        },
        
        // Document status
        documentStatus: {
          hasSTNK: hasSTNK !== undefined ? (hasSTNK === 'true' || hasSTNK === true) : undefined,
          hasSIM: hasSIM !== undefined ? (hasSIM === 'true' || hasSIM === true) : undefined,
          hasKTP: hasKTP !== undefined ? (hasKTP === 'true' || hasKTP === true) : undefined,
        },
        
        updatedAt: Date.now(),
      };

      // Hapus undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Hapus undefined fields dalam carData
      if (updateData.carData) {
        Object.keys(updateData.carData).forEach(key => {
          if (updateData.carData[key] === undefined) {
            delete updateData.carData[key];
          }
        });
        
        // Jika carData kosong setelah dihapus, hapus objek carData
        if (Object.keys(updateData.carData).length === 0) {
          delete updateData.carData;
        }
      }

      // Hapus undefined fields dalam documentStatus
      if (updateData.documentStatus) {
        Object.keys(updateData.documentStatus).forEach(key => {
          if (updateData.documentStatus[key] === undefined) {
            delete updateData.documentStatus[key];
          }
        });
        
        // Jika documentStatus kosong setelah dihapus, hapus objek documentStatus
        if (Object.keys(updateData.documentStatus).length === 0) {
          delete updateData.documentStatus;
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

  // Upload car photos for customer
  async uploadCarPhotos(req, res) {
    try {
      const userId = req.user.username;
      const { id: customerId } = req.params;
      
      // Validasi format ID
      if (!customerId.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = customerId.split('-')[0];
      
      // Pastikan customer ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this customer',
        });
      }
      
      console.log('📸 Uploading car photos for customer:', customerId);

      // Check if customer exists
      const customer = await customerDAO.getCustomerById(customerId, userId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      const files = req.files;
      const uploadedPhotos = {};

      // Upload each photo to Cloudinary
      const uploadPromises = [];

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

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Update customer with photo URLs
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

  // Upload document photos (STNK, SIM, KTP) - OPSIONAL
  async uploadDocuments(req, res) {
    try {
      const userId = req.user.username;
      const { id: customerId } = req.params;
      
      // Validasi format ID
      if (!customerId.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = customerId.split('-')[0];
      
      // Pastikan customer ID milik user yang sedang login
      if (idUsername !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this customer',
        });
      }
      
      console.log('📄 Uploading documents for customer:', customerId);

      // Check if customer exists
      const customer = await customerDAO.getCustomerById(customerId, userId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      const files = req.files;
      const uploadedDocuments = {};

      // Upload each document to Cloudinary
      const uploadPromises = [];

      // STNK Photo
      if (files.stnk && files.stnk[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}/documents`,
                public_id: `${customerId}_stnk`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedDocuments.stnk = result.secure_url;
                  resolve();
                }
              }
            );
            
            stream.end(files.stnk[0].buffer);
          })
        );
      }

      // SIM Photo
      if (files.sim && files.sim[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}/documents`,
                public_id: `${customerId}_sim`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedDocuments.sim = result.secure_url;
                  resolve();
                }
              }
            );
            
            stream.end(files.sim[0].buffer);
          })
        );
      }

      // KTP Photo
      if (files.ktp && files.ktp[0]) {
        uploadPromises.push(
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `car_insurance/customers/${customerId}/documents`,
                public_id: `${customerId}_ktp`,
                resource_type: 'image'
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  uploadedDocuments.ktp = result.secure_url;
                  resolve();
                }
              }
            );
            
            stream.end(files.ktp[0].buffer);
          })
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Update customer with document URLs
      const updatedCustomer = await customerDAO.updateCustomer(
        customerId, 
        { 
          documentPhotos: uploadedDocuments,
          updatedAt: Date.now()
        }, 
        userId
      );

      console.log('✅ Documents uploaded for customer:', customerId);

      res.status(200).json({
        success: true,
        message: 'Documents uploaded successfully',
        documents: uploadedDocuments,
        customer: updatedCustomer,
      });
    } catch (error) {
      console.error('❌ Upload documents error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while uploading documents',
      });
    }
  }

  // Delete customer
  async deleteCustomer(req, res) {
    try {
      const userId = req.user.username;
      const { id } = req.params;

      // Validasi format ID
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      // Extract username dari ID untuk verifikasi
      const idUsername = id.split('-')[0];
      
      // Pastikan customer ID milik user yang sedang login
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
          (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
          (customer.phone && customer.phone.includes(searchTerm)) ||
          (customer.carData?.plateNumber && customer.carData.plateNumber.toLowerCase().includes(searchTerm)) ||
          (customer.carData?.carBrand && customer.carData.carBrand.toLowerCase().includes(searchTerm)) ||
          (customer.carData?.carModel && customer.carData.carModel.toLowerCase().includes(searchTerm)) ||
          (customer.carData?.carPrice && customer.carData.carPrice.toString().includes(searchTerm))
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