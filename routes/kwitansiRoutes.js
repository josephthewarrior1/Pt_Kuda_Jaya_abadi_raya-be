const express = require('express');
const router = express.Router();
const kwitansiController = require('../controllers/kwitansiController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Generate kwitansi OR increment print count if exists
router.post('/kwitansi/generate', kwitansiController.createOrGetKwitansi);
router.get('/kwitansi', kwitansiController.getAllKwitansi);
router.get('/kwitansi/:id', kwitansiController.getKwitansiById);

module.exports = router;
