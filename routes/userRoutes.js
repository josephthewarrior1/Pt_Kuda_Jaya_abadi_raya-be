const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes
router.post('/users/signup', (req, res) => userController.signUp(req, res));
router.post('/users/login', (req, res) => userController.login(req, res));

// Protected routes (require authentication)
router.get('/users/profile', authMiddleware, (req, res) => userController.getProfile(req, res));
router.put('/users/profile', authMiddleware, (req, res) => userController.updateProfile(req, res));
router.put('/users/change-password', authMiddleware, (req, res) => userController.changePassword(req, res));

module.exports = router;