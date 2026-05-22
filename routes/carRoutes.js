const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadCarPhotos, uploadDocuments } = require('../middlewares/upload');

// ==================== CAR ROUTES ====================

// Get car references (brands & models)
router.get('/cars/references', authMiddleware, (req, res) =>
    carController.getCarReferences(req, res)
);

// Get all cars for current user
router.get('/cars', authMiddleware, (req, res) =>
    carController.getAllCars(req, res)
);

// Get cars by customer ID
router.get('/cars/customer/:customerId', authMiddleware, (req, res) =>
    carController.getCarsByCustomer(req, res)
);

// Get car by ID
router.get('/cars/:id', authMiddleware, (req, res) =>
    carController.getCarById(req, res)
);

// Create new car
router.post('/cars', authMiddleware, (req, res) =>
    carController.createCar(req, res)
);

// Update car
router.put('/cars/:id', authMiddleware, (req, res) =>
    carController.updateCar(req, res)
);

// Upload car photos (5 photos: left, right, front, back, dashboard)
router.post('/cars/:id/upload-photos',
    authMiddleware,
    uploadCarPhotos,
    (req, res) => carController.uploadCarPhotos(req, res)
);

// Upload document photos (STNK, SIM, KTP)
router.post('/cars/:id/upload-documents',
    authMiddleware,
    uploadDocuments,
    (req, res) => carController.uploadDocuments(req, res)
);

// Delete car
router.delete('/cars/:id', authMiddleware, (req, res) =>
    carController.deleteCar(req, res)
);

module.exports = router;
