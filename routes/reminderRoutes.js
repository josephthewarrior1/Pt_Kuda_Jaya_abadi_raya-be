const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const authMiddleware = require('../middlewares/authMiddleware');
const { adminOnly, userAndPaidUserOnly } = require('../middlewares/roleMiddleware');

// User kirim reminder ke diri sendiri sekarang (manual trigger)
router.post('/reminders/send', authMiddleware, userAndPaidUserOnly, (req, res) =>
  reminderController.sendMyReminder(req, res)
);

// Admin: trigger semua reminder sekarang (untuk testing)
router.post('/reminders/trigger-all', authMiddleware, adminOnly, (req, res) =>
  reminderController.triggerAllReminders(req, res)
);

module.exports = router;