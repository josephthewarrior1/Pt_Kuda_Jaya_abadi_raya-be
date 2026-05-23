const InvoiceDAO = require('../dao/invoiceDAO');
const PaymentDAO = require('../dao/paymentDAO');

// Create new invoice
exports.createInvoice = async (req, res) => {
  try {
    const userId = req.user.username; // from auth middleware
    const invoiceData = {
      ...req.body,
      createdBy: userId,
    };

    // Strict Rule: Block if an Unpaid invoice already exists for this car
    if (invoiceData.carId) {
      const existingUnpaid = await InvoiceDAO.getUnpaidInvoiceByCar(invoiceData.carId, userId);
      if (existingUnpaid) {
        return res.status(409).json({
          success: false,
          error: `Terdapat Invoice yang belum dibayar (${existingUnpaid.invoiceNumber}) untuk Kendaraan ini. Selesaikan atau batalkan invoice tersebut terlebih dahulu!`,
          existingInvoiceId: existingUnpaid.id
        });
      }
    }

    const newInvoice = await InvoiceDAO.createInvoice(invoiceData);

    // Auto-generate Payment with Pending status
    try {
      const paymentData = {
        customerId: newInvoice.customerId,
        carId: newInvoice.carId || '',
        renewalId: newInvoice.renewalId || '',
        invoiceNumber: newInvoice.id, // Store Invoice ID for relational tracking
        amount: newInvoice.grandTotal,
        dueDate: newInvoice.dueDate,
        status: 'Pending',
        notes: `Auto-generated from Invoice ${newInvoice.invoiceNumber}`,
        createdBy: userId,
      };
      await PaymentDAO.createPayment(paymentData);
    } catch (paymentError) {
      console.error('Warning: Failed to auto-create payment:', paymentError);
      // We still return success for invoice, maybe log this for retry later
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: newInvoice,
    });
  } catch (error) {
    console.error('Create Invoice Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get all invoices for user
exports.getAllInvoices = async (req, res) => {
  try {
    const userId = req.user.username;
    const invoices = await InvoiceDAO.getAllInvoicesByUser(userId);

    res.status(200).json({
      success: true,
      data: invoices,
      count: invoices.length,
    });
  } catch (error) {
    console.error('Get All Invoices Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const userId = req.user.username;
    const { id } = req.params;

    const invoice = await InvoiceDAO.getInvoiceById(id, userId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get Invoice By ID Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const userId = req.user.username;
    const { id } = req.params;
    const updateData = req.body;

    const updatedInvoice = await InvoiceDAO.updateInvoice(id, updateData, userId);

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice,
    });
  } catch (error) {
    console.error('Update Invoice Error:', error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
