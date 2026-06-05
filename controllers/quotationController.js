const QuotationDAO = require('../dao/quotationDAO');
const CarDAO = require('../dao/carDAO');
const RenewalDAO = require('../dao/renewalDAO');
const InvoiceDAO = require('../dao/invoiceDAO');
const PaymentDAO = require('../dao/paymentDAO');
const CustomerDAO = require('../dao/customerDAO');

const generateNumber = () => {
    const d = new Date();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QUO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${random}`;
};

exports.createQuotation = async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user.username;
    
    if (!data.carId) {
       return res.status(400).json({ success: false, error: 'Car ID is required' });
    }

    // ── Guard Logic ──
    if (data.renewalId) {
      // It's a renewal quotation: block if THIS renewal already has an Accepted quotation
      const existingQuotations = await QuotationDAO.getQuotationsByCarId(data.carId, userId);
      const acceptedForRenewal = existingQuotations.find(q => q.renewalId === data.renewalId && q.status === 'Accepted');
      if (acceptedForRenewal) {
        return res.status(409).json({
          success: false,
          error: `Renewal ini sudah memiliki Quotation yang disetujui (${acceptedForRenewal.quotationNumber || acceptedForRenewal.id}). Tidak dapat membuat Quotation baru.`,
        });
      }
    } else {
      // It's a new policy quotation (no renewal)
      
      // 1. Block if the car ALREADY has an active policy (> 30 days left) in our system
      const car = await CarDAO.getCarById(data.carId, userId);
      // We only block if there is a dueDate AND an existing insuranceProvider
      if (car && car.carData && car.carData.dueDate && car.carData.insuranceProvider) {
        const daysLeft = Math.round((new Date(car.carData.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 30) {
          const carName = `${car.carData.carBrand || ''} ${car.carData.carModel || ''}`.trim();
          return res.status(409).json({
            success: false,
            error: `Kendaraan ${carName} sudah memiliki polis aktif dari ${car.carData.insuranceProvider} (sisa ${daysLeft} hari). Gunakan fitur Renewal untuk perpanjangan, bukan Quotation baru.`,
          });
        }
      }
      
      // 2. Block if there is ALREADY an Accepted quotation for this new car
      const existingQuotations = await QuotationDAO.getQuotationsByCarId(data.carId, userId);
      const acceptedNewPolicyQuotation = existingQuotations.find(q => !q.renewalId && q.status === 'Accepted');
      if (acceptedNewPolicyQuotation) {
        return res.status(409).json({
          success: false,
          error: `Kendaraan ini sudah memiliki Quotation baru yang disetujui (${acceptedNewPolicyQuotation.quotationNumber || acceptedNewPolicyQuotation.id}). Selesaikan pembayaran tersebut atau batalkan terlebih dahulu.`,
        });
      }
    }

    const payload = {
      ...data,
      userId,
      quotationNumber: data.quotationNumber || generateNumber()
    };

    const quotation = await QuotationDAO.createQuotation(payload, userId);
    res.status(201).json({ success: true, quotation });
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ success: false, error: 'Failed to create quotation' });
  }
};

exports.getQuotationsByCarId = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user.username;
    const quotations = await QuotationDAO.getQuotationsByCarId(carId, userId);
    res.status(200).json({ success: true, quotations });
  } catch (error) {
    console.error('Error getting quotations:', error);
    res.status(500).json({ success: false, error: 'Failed to get quotations' });
  }
};

exports.acceptQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.username;
    
    const quotation = await QuotationDAO.getQuotationById(id, userId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation not found' });
    }
    
    if (quotation.status === 'Accepted') {
      return res.status(400).json({ success: false, error: 'Quotation is already accepted' });
    }

    // Pre-checks for Renewal-linked quotations BEFORE marking Accepted
    if (quotation.renewalId) {
      const renewalId = String(quotation.renewalId).trim();
      const renewal = await RenewalDAO.getRenewalById(renewalId, userId);
      if (!renewal) {
        return res.status(404).json({
          success: false,
          error: 'Linked renewal not found',
        });
      }

      if (renewal.carId !== quotation.carId) {
        return res.status(400).json({
          success: false,
          error: 'Renewal does not match quotation car',
        });
      }

      const existingUnpaid = await InvoiceDAO.getUnpaidInvoiceByCar(quotation.carId, userId);
      if (existingUnpaid) {
        return res.status(409).json({
          success: false,
          error: `Terdapat Invoice yang belum dibayar (${existingUnpaid.invoiceNumber}) untuk Kendaraan ini. Selesaikan atau batalkan invoice tersebut terlebih dahulu!`,
          existingInvoiceId: existingUnpaid.id,
        });
      }
    }

    // 1. Update status to Accepted
    const acceptedQuotation = await QuotationDAO.updateQuotation(id, { status: 'Accepted' }, userId);

    // 2. Delete all other pending quotes for the same car
    if (quotation.carId) {
        await QuotationDAO.deletePendingQuotationsExcept(quotation.carId, id, userId);
    }

    // 3. Update the Car with the chosen insurance data
    if (quotation.carId) {
       const car = await CarDAO.getCarById(quotation.carId, userId);
       if (car) {
          const enabledCoverages = quotation.coverages 
             ? Object.keys(quotation.coverages).filter(k => quotation.coverages[k].enabled) 
             : [];
          
          await CarDAO.updateCar(quotation.carId, {
             ...car,
             carData: {
                ...car.carData,
                insuranceProvider: quotation.insuranceProvider || '',
                insuranceType: quotation.insuranceType || '',
                coverageExtensions: enabledCoverages
             }
          }, userId);
       }
    }

    // 4. Renewal flow: only after Quotation Accepted → create Invoice + Payment
    if (acceptedQuotation.renewalId) {
      const renewalId = String(acceptedQuotation.renewalId).trim();
      const renewal = await RenewalDAO.getRenewalById(renewalId, userId);
      const customer = await CustomerDAO.getCustomerById(renewal.customerId, userId);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found for renewal' });
      }

      const car = await CarDAO.getCarById(acceptedQuotation.carId, userId);
      const plateNumber = car?.carData?.plateNumber || car?.carData?.nopol || '';

      const amountCandidate = acceptedQuotation.premium
        ?? acceptedQuotation.totalPremium
        ?? acceptedQuotation.grandTotal
        ?? acceptedQuotation.total
        ?? acceptedQuotation.price
        ?? renewal.premium
        ?? 0;
      const amount = Number.parseFloat(amountCandidate) || 0;

      const issueDate = Date.now();
      // Invoice dueDate should be payment deadline (e.g., 14 days from now), not the 1-year policy end date
      const dueDate = issueDate + (14 * 24 * 60 * 60 * 1000); 

      const newInvoice = await InvoiceDAO.createInvoice({
        customerId: renewal.customerId,
        customerName: customer.name || '',
        carId: acceptedQuotation.carId,
        plateNumber,
        quotationId: acceptedQuotation.id || id,
        renewalId: renewalId,
        items: acceptedQuotation.items || [
          { name: 'Renewal Premium', qty: 1, price: amount, total: amount },
        ],
        subTotal: acceptedQuotation.subTotal ?? amount,
        discount: acceptedQuotation.discount ?? 0,
        grandTotal: amount,
        issueDate,
        dueDate,
        status: 'Unpaid',
        notes: `Auto-generated from accepted Quotation ${acceptedQuotation.quotationNumber || acceptedQuotation.id}`,
        createdBy: userId,
        createdAt: issueDate,
        updatedAt: issueDate,
      });

      const newPayment = await PaymentDAO.createPayment({
        customerId: renewal.customerId,
        carId: acceptedQuotation.carId,
        renewalId: renewalId,
        invoiceNumber: newInvoice.id,
        amount: newInvoice.grandTotal,
        dueDate: newInvoice.dueDate,
        status: 'Pending',
        notes: `Auto-generated from Invoice ${newInvoice.invoiceNumber}`,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Link payment back to renewal (so manual completeRenewal still works)
      await RenewalDAO.updateRenewal(renewalId, { paymentId: newPayment.id, status: 'Approved', premium: amount }, userId);
    }

    res.status(200).json({ success: true, message: 'Quotation accepted successfully', quotation: acceptedQuotation });
  } catch (error) {
    console.error('Error accepting quotation:', error);
    res.status(500).json({ success: false, error: 'Failed to accept quotation' });
  }
};

exports.deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.username;
    await QuotationDAO.deleteQuotation(id, userId);
    res.status(200).json({ success: true, message: 'Quotation deleted' });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ success: false, error: 'Failed to delete quotation' });
  }
};

exports.getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.username;
    const quotation = await QuotationDAO.getQuotationById(id, userId);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation not found' });
    }
    res.status(200).json({ success: true, quotation });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quotation' });
  }
};
