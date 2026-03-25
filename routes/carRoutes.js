const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const authMiddleware = require('../middlewares/authMiddleware');
const { userAndPaidUserOnly } = require('../middlewares/roleMiddleware');
const { uploadCarPhotos, uploadDocuments } = require('../middlewares/upload');

// ==================== CAR ROUTES (USER & PAID_USER ONLY) ====================

// Get all cars for current user
router.get('/cars', authMiddleware, userAndPaidUserOnly, (req, res) =>
    carController.getAllCars(req, res)
);

// Get cars by customer ID
router.get('/cars/customer/:customerId', authMiddleware, userAndPaidUserOnly, (req, res) =>
    carController.getCarsByCustomer(req, res)
);

// Get car by ID
router.get('/cars/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
    carController.getCarById(req, res)
);

// Create new car
router.post('/cars', authMiddleware, userAndPaidUserOnly, (req, res) =>
    carController.createCar(req, res)
);

// Update car
router.put('/cars/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
    carController.updateCar(req, res)
);

// Upload car photos (4 photos: left, right, front, back)
router.post('/cars/:id/upload-photos',
    authMiddleware,
    userAndPaidUserOnly,
    uploadCarPhotos,
    (req, res) => carController.uploadCarPhotos(req, res)
);

// Upload document photos (STNK, SIM, KTP)
router.post('/cars/:id/upload-documents',
    authMiddleware,
    userAndPaidUserOnly,
    uploadDocuments,
    (req, res) => carController.uploadDocuments(req, res)
);

// Delete car
router.delete('/cars/:id', authMiddleware, userAndPaidUserOnly, (req, res) =>
    carController.deleteCar(req, res)
);

module.exports = router;
