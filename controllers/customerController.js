const customerDAO = require('../dao/customerDAO');
const cloudinary = require('../config/cloudinary');

class CustomerController {
  // Get all customers (for current user) — aggregates first car per customer for list view
  async getAllCustomers(req, res) {
    try {
      const userId = req.user.username;
      const carDAO = require('../dao/carDAO');

      console.log('📋 Getting customers for user:', userId);

      const customers = await customerDAO.getAllCustomersByUser(userId);
      const allCars = await carDAO.getAllCarsByUser(userId);

      // Build a map: customerId → first car
      const firstCarByCustomer = {};
      for (const car of allCars) {
        if (!firstCarByCustomer[car.customerId]) {
          firstCarByCustomer[car.customerId] = car;
        }
      }

      // Attach first car info to each customer
      const enrichedCustomers = customers.map(customer => {
        const firstCar = firstCarByCustomer[customer.id];
        return {
          ...customer,
          carData: firstCar ? firstCar.carData : null,
          carPhotos: firstCar ? firstCar.carPhotos : null,
          status: customer.status || (firstCar ? (
            firstCar.carData?.dueDate
              ? (new Date(firstCar.carData.dueDate) > new Date() ? 'Active' : 'Expired')
              : null
          ) : null),
          firstCarId: firstCar ? firstCar.id : null,
        };
      });

      res.status(200).json({
        success: true,
        count: enrichedCustomers.length,
        customers: enrichedCustomers,
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

      // Firestore query via DAO implicitly scopes by userId, ensuring secure access.

      const carDAO = require('../dao/carDAO');
      const customer = await customerDAO.getCustomerById(id, userId);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      const cars = await carDAO.getCarsByCustomerId(id, userId);

      res.status(200).json({
        success: true,
        customer,
        cars,
      });
    } catch (error) {
      console.error('❌ Get customer error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching customer',
      });
    }
  }

  // Create new customer
  async createCustomer(req, res) {
    try {
      const userId = req.user.username;
      const {
        name,
        email,
        phone,
        address,
        notes,
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

        // Status - default null
        status: null,

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

      // Validasi format ID
      if (!id.includes('-')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customer ID format. Expected: {username}-{number}',
        });
      }

      // Firestore query via DAO implicitly scopes by userId, ensuring secure access.

      const {
        name, email, phone, address, notes, status,
      } = req.body;

      // Validation
      if (name !== undefined && name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Customer name cannot be empty',
        });
      }

      const allowedStatuses = ['Cancelled', null, undefined];
      if (status !== undefined && !allowedStatuses.includes(status) && status !== 'null') {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value. Allowed: Cancelled or null (to reset)',
        });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email.trim();
      if (phone !== undefined) updateData.phone = phone.trim();
      if (address !== undefined) updateData.address = address.trim();
      if (notes !== undefined) updateData.notes = notes.trim();
      if (status !== undefined) updateData.status = status === 'null' ? null : status;

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

      // Firestore query via DAO implicitly scopes by userId, ensuring secure access.

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
          (customer.phone && customer.phone.includes(searchTerm))
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
