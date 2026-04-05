const KwitansiDAO = require('../dao/kwitansiDAO');
const PaymentDAO = require('../dao/paymentDAO');
const InvoiceDAO = require('../dao/invoiceDAO');

exports.createOrGetKwitansi = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'Payment ID is required' });
    }

    // 1. Check if Kwitansi already exists for this payment
    let kwitansi = await KwitansiDAO.getKwitansiByPaymentId(paymentId, userId);
    
    if (kwitansi) {
      // Just increment the print count
      kwitansi = await KwitansiDAO.incrementPrintCount(kwitansi.id, userId);
      return res.status(200).json({
        success: true,
        message: 'Kwitansi found and print count incremented',
        data: kwitansi
      });
    }

    // 2. Fetch Payment and Validate Status
    const payment = await PaymentDAO.getPaymentById(paymentId, userId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'Paid') {
      return res.status(400).json({ success: false, error: 'Payment is not fully paid yet' });
    }

    // 3. Get corresponding Invoice for the Kwitansi details
    let invoiceData = null;
    if (payment.invoiceNumber) {
      const invoice = await InvoiceDAO.getInvoiceById(payment.invoiceNumber, userId);
      if (invoice) {
        invoiceData = {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          items: invoice.items,
          grandTotal: invoice.grandTotal
        };
      }
    }

    // 4. Create new Kwitansi
    const kwitansiData = {
      paymentId,
      invoiceData,
      createdBy: userId
    };

    const newKwitansi = await KwitansiDAO.createKwitansi(kwitansiData);

    res.status(201).json({
      success: true,
      message: 'Kwitansi generated successfully',
      data: newKwitansi,
    });
  } catch (error) {
    console.error('Create/Get Kwitansi Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllKwitansi = async (req, res) => {
  try {
    const userId = req.user.uid;
    const kwitansis = await KwitansiDAO.getAllKwitansiByUser(userId);

    res.status(200).json({
      success: true,
      data: kwitansis,
      count: kwitansis.length
    });
  } catch (error) {
    console.error('Get All Kwitansi Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getKwitansiById = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const kwitansi = await KwitansiDAO.getKwitansiById(id, userId);

    if (!kwitansi) {
      return res.status(404).json({ success: false, error: 'Kwitansi not found' });
    }

    res.status(200).json({ success: true, data: kwitansi });
  } catch (error) {
    console.error('Get Kwitansi By ID Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
