const QuotationDAO = require('../dao/quotationDAO');
const CarDAO = require('../dao/carDAO');

const generateNumber = () => {
    const d = new Date();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QUO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${random}`;
};

exports.createQuotation = async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user.username; // Multi-tenant structure assumes username
    
    if (!data.policyId) {
       return res.status(400).json({ success: false, error: 'Policy ID is required' });
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

exports.getQuotationsByPolicy = async (req, res) => {
  try {
    const { policyId } = req.params;
    const userId = req.user.username;
    const quotations = await QuotationDAO.getQuotationsByPolicy(policyId, userId);
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

    // 1. Update status to Accepted
    await QuotationDAO.updateQuotation(id, { status: 'Accepted' }, userId);

    // 2. Delete all other pending quotes for the same policy
    if (quotation.policyId) {
        await QuotationDAO.deletePendingQuotationsExcept(quotation.policyId, id, userId);
    }

    // 3. Update the Car/Policy with the chosen insurance data
    if (quotation.policyType === 'car' && quotation.policyId) {
       const car = await CarDAO.getCarById(quotation.policyId, userId);
       if (car) {
          const enabledCoverages = quotation.coverages 
             ? Object.keys(quotation.coverages).filter(k => quotation.coverages[k].enabled) 
             : [];
          
          await CarDAO.updateCar(quotation.policyId, {
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

    res.status(200).json({ success: true, message: 'Quotation accepted successfully', quotation });
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
