const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const { adminOnly, paidOnly } = require('../middlewares/roleMiddleware');

// ==================== PUBLIC ROUTES ====================
router.post('/users/signup', (req, res) => userController.signUp(req, res));
router.post('/users/login', (req, res) => userController.login(req, res));

// ==================== PROTECTED ROUTES (ALL USERS) ====================
router.get('/users/profile', authMiddleware, (req, res) => userController.getProfile(req, res));
router.put('/users/profile', authMiddleware, (req, res) => userController.updateProfile(req, res));
router.put('/users/change-password', authMiddleware, (req, res) => userController.changePassword(req, res));

// ==================== ADMIN ONLY ROUTES ====================
router.get('/users', authMiddleware, adminOnly, (req, res) => userController.getAllUsers(req, res));
router.put('/users/:username/role', authMiddleware, adminOnly, (req, res) => userController.updateUserRole(req, res));
router.delete('/users/:username', authMiddleware, adminOnly, (req, res) => userController.deleteUser(req, res));

// ==================== PAID USER + ADMIN ROUTES ====================
// Contoh: Tambahkan route khusus paid user di sini
// router.get('/premium/feature', authMiddleware, paidOnly, (req, res) => someController.premiumFeature(req, res));

module.exports = router;